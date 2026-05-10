import { get, post } from "../client/http";
import { buildQueryString } from "../client/queryString";
import type { ListResponse } from "../types/list";

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
