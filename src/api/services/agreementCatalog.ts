import { get } from "../client/http";
import { buildQueryString } from "../client/queryString";
import type { BaseListQuery, ListResponse } from "../types/list";

const DEFAULT_LIST_LIMIT = 100;

function clampPageLimit(params: { page?: number; limit?: number }): { page: number; limit: number } {
	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(100, Math.max(1, params.limit ?? DEFAULT_LIST_LIMIT));
	return { page, limit };
}

function commonQueryParts(params: BaseListQuery): Record<string, string | number | undefined> {
	const { page, limit } = clampPageLimit(params);
	const q = params.q?.trim() || params.search?.trim();
	return {
		page,
		limit,
		sort: params.sort,
		...(q ? { q } : {}),
		...(params.createdAfter ? { createdAfter: params.createdAfter } : {}),
		...(params.createdBefore ? { createdBefore: params.createdBefore } : {}),
	};
}

/** True when `value` is a 24-char hex string (MongoDB ObjectId format). */
export function isMongoObjectIdString(value: string): boolean {
	return /^[0-9a-fA-F]{24}$/.test(value.trim());
}

export interface AgreementCategoryApi {
	_id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface AgreementDomainApi {
	_id: string;
	name: string;
	category?: { _id: string; name: string };
	createdAt?: string;
	updatedAt?: string;
}

export interface AgreementTypeApi {
	_id: string;
	name: string;
	domain?: { _id: string; name: string; category?: { _id: string; name: string } };
	createdAt?: string;
	updatedAt?: string;
}

export interface AgreementSubtypeApi {
	_id: string;
	name: string;
	agreementType?: {
		_id: string;
		name: string;
		domain?: { _id: string; name: string; category?: { _id: string; name: string } };
	};
	createdAt?: string;
	updatedAt?: string;
}

/** Lean row from `GET /api/agreement-steps` (name is unique on the server). */
export interface AgreementStepApi {
	_id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export type ListAgreementCategoriesParams = BaseListQuery;

export interface ListAgreementDomainsParams extends BaseListQuery {
	agreement_category?: string;
}

export interface ListAgreementTypesParams extends BaseListQuery {
	agreement_domain?: string;
}

export interface ListAgreementSubtypesParams extends BaseListQuery {
	agreement_type?: string;
}

export async function listAgreementCategories(
	params: ListAgreementCategoriesParams = {}
): Promise<ListResponse<AgreementCategoryApi>> {
	const qs = buildQueryString(commonQueryParts(params));
	return get<ListResponse<AgreementCategoryApi>>(`/api/agreement-categories${qs}`);
}

export async function listAgreementDomains(
	params: ListAgreementDomainsParams = {}
): Promise<ListResponse<AgreementDomainApi>> {
	const { agreement_category, ...rest } = params;
	const qs = buildQueryString({
		...commonQueryParts(rest),
		...(agreement_category?.trim() ? { agreement_category: agreement_category.trim() } : {}),
	});
	return get<ListResponse<AgreementDomainApi>>(`/api/agreement-domains${qs}`);
}

export async function listAgreementTypes(
	params: ListAgreementTypesParams = {}
): Promise<ListResponse<AgreementTypeApi>> {
	const { agreement_domain, ...rest } = params;
	const qs = buildQueryString({
		...commonQueryParts(rest),
		...(agreement_domain?.trim() ? { agreement_domain: agreement_domain.trim() } : {}),
	});
	return get<ListResponse<AgreementTypeApi>>(`/api/agreement-types${qs}`);
}

export async function listAgreementSubtypes(
	params: ListAgreementSubtypesParams = {}
): Promise<ListResponse<AgreementSubtypeApi>> {
	const { agreement_type, ...rest } = params;
	const qs = buildQueryString({
		...commonQueryParts(rest),
		...(agreement_type?.trim() ? { agreement_type: agreement_type.trim() } : {}),
	});
	return get<ListResponse<AgreementSubtypeApi>>(`/api/agreement-subtypes${qs}`);
}

/**
 * List agreement steps (wizard / config `steps` must use these `_id` values).
 * @see GET `/api/agreement-steps` — supports `page`, `limit`, `sort` (name | createdAt | updatedAt, optional `-` prefix), `q` or `search`, `createdAfter`, `createdBefore`.
 */
export type ListAgreementStepsParams = BaseListQuery;

export async function listAgreementSteps(
	params: ListAgreementStepsParams = {}
): Promise<ListResponse<AgreementStepApi>> {
	const qs = buildQueryString(commonQueryParts(params));
	return get<ListResponse<AgreementStepApi>>(`/api/agreement-steps${qs}`);
}
