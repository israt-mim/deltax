import { buildQueryString } from "../client/queryString";
import { get } from "../client/http";
import type { ListResponse } from "../types/list";

/**
 * Flattened clause row from GET /api/clauses (merged root + general + gsa + flowdown).
 */
export interface ClauseListItem {
	_id: string;
	displayId?: string;
	tags?: string[];
	isActive?: boolean;
	createdAt?: string;
	updatedAt?: string;
	__v?: number;
	number?: string;
	title?: string;
	description?: string;
	text?: string;
	validFrom?: string;
	validTo?: string;
	category?: string;
	subcategory?: string;
	language?: string;
	documentType?: string;
	reference?: string;
	deviation?: string;
	version?: string;
	pOrC?: string;
	ibr?: string;
	usaceCsi?: string;
	ucf?: string;
	fp?: string;
	cr?: string;
	tmLh?: string;
	sup?: string;
	svc?: string;
	rAndD?: string;
	con?: string;
	lmv?: string;
	comSvc?: string;
	ddr?: string;
	aE?: string;
	salesOrder?: boolean;
	schedulingAgreement?: boolean;
	wbs?: boolean;
	flowToPurchasingContract?: boolean;
	printOnRfq?: boolean;
	equipment?: boolean;
	delivery?: boolean;
	purchaseRequisition?: boolean;
	billingDocument?: boolean;
	printOnPurchasingContract?: boolean;
	flowToInspectionLot?: boolean;
	serviceNotification?: boolean;
	productionOrder?: boolean;
	purchaseOrder?: boolean;
	accountingDocument?: boolean;
	flowToRfq?: boolean;
	printOnInspectionLot?: boolean;
	serviceOrder?: boolean;
}

export interface ClausesListParams {
	page?: number;
	limit?: number;
	/** displayId, createdAt, updatedAt, isActive, general.title, general.category; prefix `-` for descending. */
	sort?: string;
	search?: string;
	q?: string;
	displayId?: string;
	category?: string;
	subcategory?: string;
	documentType?: string;
	isActive?: boolean;
	tag?: string;
	tags?: string;
	createdAfter?: string;
	createdBefore?: string;
}

function boolQuery(value: boolean | undefined): string | undefined {
	if (value === undefined) return undefined;
	return value ? "true" : "false";
}

export async function listClauses(params: ClausesListParams): Promise<ListResponse<ClauseListItem>> {
	const qs = buildQueryString({
		page: params.page,
		limit: params.limit,
		sort: params.sort,
		search: params.search?.trim(),
		q: params.q?.trim(),
		displayId: params.displayId?.trim(),
		category: params.category?.trim(),
		subcategory: params.subcategory?.trim(),
		documentType: params.documentType?.trim(),
		isActive: boolQuery(params.isActive),
		tag: params.tag?.trim(),
		tags: params.tags?.trim(),
		createdAfter: params.createdAfter?.trim(),
		createdBefore: params.createdBefore?.trim(),
	});
	return get<ListResponse<ClauseListItem>>(`/api/clauses${qs}`);
}

export type ClauseSectionName = "general" | "gsa" | "flowdown";

/** Single block inside `sections[].fields` (always one object per section). */
export type ClauseSectionFields = Record<string, unknown>;

export interface ClauseDetailSection {
	name: ClauseSectionName;
	fields: ClauseSectionFields[];
}

/** GET /api/clauses/:id — nested `sections` (general / gsa / flowdown), not flattened. */
export interface ClauseDetailApi {
	_id: string;
	displayId: string;
	tags: string[];
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	sections: ClauseDetailSection[];
}

export async function getClauseById(id: string): Promise<ClauseDetailApi> {
	return get<ClauseDetailApi>(`/api/clauses/${encodeURIComponent(id)}`);
}

export function getClauseSectionFields(
	detail: ClauseDetailApi,
	section: ClauseSectionName
): ClauseSectionFields | undefined {
	const s = detail.sections?.find((x) => x.name === section);
	const block = s?.fields?.[0];
	return block && typeof block === "object" ? (block as ClauseSectionFields) : undefined;
}
