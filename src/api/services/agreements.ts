import { ApiError, get, post } from "../client/http";
import { buildQueryString } from "../client/queryString";
import type { ListResponse } from "../types/list";
import { isMongoObjectIdString } from "./agreementCatalog";

export interface CreateAgreementBody {
	agreement_category_id: string;
	agreement_domain_id: string;
	agreement_type_id: string;
	agreement_subtype_id: string;
	agreement_display_name: string;
	agreement_type?: string;
	agreement_subtype?: string;
	displayId?: string;
}

export interface CreateAgreementResponse {
	id: string;
	displayId: string;
	status: string;
}

/** POST /api/agreements */
export async function createAgreement(body: CreateAgreementBody): Promise<CreateAgreementResponse> {
	return post<CreateAgreementResponse>("/api/agreements", body);
}

/** Step from `GET /api/agreements/:id/steps` (id + name). */
export interface AgreementDocumentStep {
	id: string;
	name: string;
}

export interface GetAgreementStepsResponse {
	steps: AgreementDocumentStep[];
}

/** GET /api/agreements/:id/steps */
export async function getAgreementSteps(agreementId: string): Promise<GetAgreementStepsResponse> {
	return get<GetAgreementStepsResponse>(`/api/agreements/${encodeURIComponent(agreementId)}/steps`);
}

/** Flattened field from GET /api/agreements/:id/details?of= */
export interface AgreementStepDetailsField {
	id: string;
	name: string;
	group?: string;
	groupTechnicalName?: string;
	context?: string;
	tags?: string[];
	tooltip?: string;
	visible?: boolean;
	required?: boolean;
	disabled?: boolean;
	locked?: boolean;
	fieldType?: string;
	dataType?: string;
	choiceOptions?: unknown[];
	value: unknown;
}

export interface AgreementStepDetailsSection {
	name: string;
	fields: AgreementStepDetailsField[];
}

export interface AgreementStepDetailsData {
	sections: AgreementStepDetailsSection[];
	step: { id: string; name: string; catalogStepName?: string | null };
	agreementConfigId: string;
	agreementConfigDisplayId?: string;
}

export interface AgreementStepDetailsEnvelope {
	data: AgreementStepDetailsData | null;
	status: string;
	message?: string;
}

/**
 * `of` query for GET /api/agreements/:id/details — prefer step ObjectId when valid; otherwise slug from name
 * (e.g. "Header" → "header").
 */
export function agreementStepDetailsOfQuery(step: { id: string; name: string }): string {
	const id = step.id?.trim() ?? "";
	if (isMongoObjectIdString(id)) return id;
	const raw = step.name?.trim().toLowerCase() ?? "";
	const slug = raw.replace(/[^a-z0-9]+/g, "");
	return slug.length > 0 ? slug : id;
}

/** GET /api/agreements/:id/details?of= */
export async function getAgreementStepDetails(agreementId: string, of: string): Promise<AgreementStepDetailsData> {
	const trimmed = of.trim();
	if (!trimmed) {
		throw new ApiError("Step reference (of) is required.", 400, undefined);
	}
	const qs = buildQueryString({ of: trimmed });
	const body = await get<AgreementStepDetailsEnvelope>(
		`/api/agreements/${encodeURIComponent(agreementId)}/details${qs}`
	);
	if (body.status !== "success" || body.data == null) {
		const msg =
			typeof body.message === "string" && body.message.trim()
				? body.message.trim()
				: "Could not load agreement step details.";
		throw new ApiError(msg, 400, body);
	}
	return body.data;
}

/** POST /api/agreements/bulk-delete — single or multiple agreement documents (non-empty `ids`). */
export interface BulkDeleteAgreementsResponse {
	message: string;
	deletedCount: number;
	requestedCount: number;
}

export async function bulkDeleteAgreements(ids: string[]): Promise<BulkDeleteAgreementsResponse> {
	return post<BulkDeleteAgreementsResponse>("/api/agreements/bulk-delete", { ids });
}

export interface AgreementListUser {
	_id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	username?: string;
}

export interface AgreementListItem {
	_id: string;
	displayId?: string;
	agreement_display_name?: string;
	status?: "draft" | "active" | "archived" | "cancelled" | string;
	agreement_category?: { _id: string; name?: string };
	agreement_domain?: { _id: string; name?: string };
	agreement_type?: { _id: string; name?: string };
	agreement_subtype?: { _id: string; name?: string };
	createdBy?: AgreementListUser;
	modifiedBy?: AgreementListUser;
	createdAt?: string;
	modifiedAt?: string;
}

export interface AgreementsListParams {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
	q?: string;
	displayId?: string;
	agreement_display_name?: string;
	status?: "draft" | "active" | "archived" | "cancelled";
	agreement_category?: string;
	agreement_domain?: string;
	agreement_type?: string;
	agreement_subtype?: string;
	createdAfter?: string;
	createdBefore?: string;
}

/** GET /api/agreements */
export async function listAgreements(
	params: AgreementsListParams
): Promise<ListResponse<AgreementListItem>> {
	const qs = buildQueryString({
		page: params.page,
		limit: params.limit,
		sort: params.sort?.trim(),
		search: params.search?.trim(),
		q: params.q?.trim(),
		displayId: params.displayId?.trim(),
		agreement_display_name: params.agreement_display_name?.trim(),
		status: params.status?.trim(),
		agreement_category: params.agreement_category?.trim(),
		agreement_domain: params.agreement_domain?.trim(),
		agreement_type: params.agreement_type?.trim(),
		agreement_subtype: params.agreement_subtype?.trim(),
		createdAfter: params.createdAfter?.trim(),
		createdBefore: params.createdBefore?.trim(),
	});
	return get<ListResponse<AgreementListItem>>(`/api/agreements${qs}`);
}
