import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { del, get, patch, post } from "../client/http";
import { buildQueryString } from "../client/queryString";
import type { BaseListQuery, ListResponse } from "../types/list";
import type { BulkDeleteResult } from "../types/bulkDelete";
import type { FieldRow } from "../../schemas/fieldConfiguration";

export const FIELD_TYPES = ["Header", "Line Item", "Modification", "Generic"] as const;
export const DATA_TYPES = [
	"Boolean",
	"Choice",
	"Currency",
	"Date",
	"DateTime",
	"Dynamic",
	"E-Mail",
	"Number",
	"String",
] as const;

export type FieldTypeValue = (typeof FIELD_TYPES)[number];
export type FieldDataTypeValue = (typeof DATA_TYPES)[number];

export interface FieldDetails {
	name: string;
	group: string;
	groupTechnicalName: string;
	context: string;
	tags: string[];
	tooltip: string;
	visible: boolean;
	required: boolean;
	disabled: boolean;
	locked: boolean;
}

export interface FieldTypePayload {
	fieldType: FieldTypeValue | string;
	dataType: FieldDataTypeValue | string;
	choiceOptions: string[];
	/** Server accepts null; JSON may use string / number / boolean / ISO date string. */
	defaultValue: unknown;
}

export interface FieldConfigurationApiDocument {
	_id: string;
	details: FieldDetails;
	type: FieldTypePayload;
	createdAt: string;
	updatedAt: string;
	createdBy?: string;
	updatedBy?: string;
}

export interface CreateFieldBody {
	details: FieldDetails;
	type: FieldTypePayload;
}

export interface UpdateFieldBody {
	details?: Partial<FieldDetails>;
	type?: Partial<FieldTypePayload>;
}

export interface FieldContextOption {
	value: string;
	label: string;
}

export interface FieldGroupApiItem {
	_id: string;
	name: string;
	technicalName: string;
	createdAt: string;
	updatedAt: string;
}

export async function getFieldGroups(): Promise<FieldGroupApiItem[]> {
	const res = await get<{ data: FieldGroupApiItem[] }>("/api/fields/groups");
	return res.data ?? [];
}

export interface ListFieldsParams extends BaseListQuery {
	/** Substring search (server); also send as `search` if API accepts both `q` and `search`. */
	group?: string;
	context?: string;
	fieldType?: string;
	dataType?: string;
	/** When set, returns Global/Generic fields plus fields for this config's category-domain-type-subtype context. */
	agreementConfigId?: string;
}

function serializeDefaultForApi(
	_dataType: string,
	value: string | number | boolean | Dayjs | null
): unknown {
	if (value === null || value === undefined) return null;
	if (dayjs.isDayjs(value)) return value.toISOString();
	return value;
}

/** Build POST /api/fields body from wizard state. */
export function buildFieldConfigurationCreateBody(params: {
	name: string;
	group: string;
	groupTechName: string;
	context: string;
	tags: string[];
	tooltip: string;
	visible: boolean;
	required: boolean;
	disabled: boolean;
	locked: boolean;
	fieldType: string;
	dataType: string;
	choiceOptions: string[];
	defaultValue: string | number | boolean | Dayjs | null;
}): CreateFieldBody {
	const choiceNormalized =
		params.dataType === "Choice" ? params.choiceOptions.map((s) => s.trim()).filter(Boolean) : [];

	return {
		details: {
			name: params.name.trim(),
			group: params.group.trim(),
			groupTechnicalName: params.groupTechName.trim(),
			context: params.context.trim(),
			tags: params.tags,
			tooltip: params.tooltip,
			visible: params.visible,
			required: params.required,
			disabled: params.disabled,
			locked: params.locked,
		},
		type: {
			fieldType: params.fieldType,
			dataType: params.dataType,
			choiceOptions: choiceNormalized,
			defaultValue: serializeDefaultForApi(params.dataType, params.defaultValue),
		},
	};
}

export function fieldDocToRow(doc: FieldConfigurationApiDocument): FieldRow {
	return {
		id: doc._id,
		name: doc.details?.name ?? "",
		group: doc.details?.group ?? "",
		groupTechnicalName: doc.details?.groupTechnicalName ?? "",
		context: doc.details?.context ?? "",
		type: doc.type?.fieldType ?? "",
		dataType: doc.type?.dataType ?? "",
		tags: Array.isArray(doc.details?.tags) ? doc.details.tags : [],
	};
}

export async function createField(body: CreateFieldBody): Promise<FieldConfigurationApiDocument> {
	return post<FieldConfigurationApiDocument>("/api/fields", body);
}

export async function getFieldById(id: string): Promise<FieldConfigurationApiDocument> {
	return get<FieldConfigurationApiDocument>(`/api/fields/${encodeURIComponent(id)}`);
}

export async function updateField(
	id: string,
	body: UpdateFieldBody
): Promise<FieldConfigurationApiDocument> {
	return patch<FieldConfigurationApiDocument>(`/api/fields/${encodeURIComponent(id)}`, body);
}

export async function deleteField(id: string): Promise<{ message: string }> {
	return del<{ message: string }>(`/api/fields/${encodeURIComponent(id)}`);
}

export async function bulkDeleteFields(ids: string[]): Promise<BulkDeleteResult> {
	const unique = [...new Set(ids)];
	return post<BulkDeleteResult>("/api/fields/bulk-delete", { ids: unique });
}

/** GET /api/fields/context-options — Global plus unique agreement config taxonomy labels. */
export async function getFieldContextOptions(): Promise<FieldContextOption[]> {
	const res = await get<{ data: FieldContextOption[] }>("/api/fields/context-options");
	return res.data ?? [];
}

export async function listFields(
	params: ListFieldsParams = {}
): Promise<ListResponse<FieldConfigurationApiDocument>> {
	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(100, Math.max(1, params.limit ?? 10));
	const qs = buildQueryString({
		page,
		limit,
		sort: params.sort,
		q: params.q,
		search: params.search,
		group: params.group,
		context: params.context,
		fieldType: params.fieldType,
		dataType: params.dataType,
		agreementConfigId: params.agreementConfigId?.trim(),
		createdAfter: params.createdAfter,
		createdBefore: params.createdBefore,
	});
	return get<ListResponse<FieldConfigurationApiDocument>>(`/api/fields${qs}`);
}
