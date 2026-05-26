import { buildQueryString } from "../client/queryString";
import { del, get, patch, post } from "../client/http";
import type { ListResponse } from "../types/list";

export interface TemplateCatalogRef {
	_id: string;
	name: string;
}

export interface TemplateUserRef {
	_id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	username?: string;
	profilePictureUrl?: string | null;
}

export interface TemplateAgreementRef {
	_id: string;
	displayId?: string;
	agreement_display_name?: string;
}

export interface TemplateListItem {
	_id: string;
	name: string;
	description?: string;
	content?: unknown;
	content_html?: string;
	agreement_category: TemplateCatalogRef;
	agreement_domain: TemplateCatalogRef;
	agreement_type: TemplateCatalogRef;
	agreement_subtype: TemplateCatalogRef;
	agreement?: TemplateAgreementRef | null;
	createdBy?: TemplateUserRef;
	updatedBy?: TemplateUserRef;
	createdAt: string;
	updatedAt: string;
}

export interface TemplateRow {
	id: string;
	name: string;
	description: string;
	category: string;
	domain: string;
	type: string;
	subtype: string;
	createdBy: TemplateUserRef | null;
	updatedBy: TemplateUserRef | null;
	createdAt: string;
	updatedAt: string;
}

export interface ListTemplatesParams {
	page?: number;
	limit?: number;
	sort?: string;
	category?: string;
	domain?: string;
	type?: string;
	subtype?: string;
	agreement?: string;
}

export interface CreateTemplateBody {
	name: string;
	description?: string;
	content: unknown;
	content_html: string;
	agreement_category: string;
	agreement_domain: string;
	agreement_type: string;
	agreement_subtype: string;
	agreement?: string;
}

export type UpdateTemplateBody = Partial<CreateTemplateBody>;

export function templateDocToRow(doc: TemplateListItem): TemplateRow {
	return {
		id: doc._id,
		name: doc.name,
		description: doc.description ?? "",
		category: doc.agreement_category?.name ?? "",
		domain: doc.agreement_domain?.name ?? "",
		type: doc.agreement_type?.name ?? "",
		subtype: doc.agreement_subtype?.name ?? "",
		createdBy: doc.createdBy ?? null,
		updatedBy: doc.updatedBy ?? null,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export async function listTemplates(params: ListTemplatesParams = {}): Promise<ListResponse<TemplateListItem>> {
	const qs = buildQueryString({
		page: params.page,
		limit: params.limit,
		sort: params.sort,
		category: params.category,
		domain: params.domain,
		type: params.type,
		subtype: params.subtype,
		agreement: params.agreement,
	});
	return get<ListResponse<TemplateListItem>>(`/api/templates${qs}`);
}

export async function getTemplateById(id: string): Promise<TemplateListItem> {
	return get<TemplateListItem>(`/api/templates/${encodeURIComponent(id)}`);
}

export async function createTemplate(body: CreateTemplateBody): Promise<TemplateListItem> {
	return post<TemplateListItem>("/api/templates", body);
}

export async function updateTemplate(id: string, body: UpdateTemplateBody): Promise<TemplateListItem> {
	return patch<TemplateListItem>(`/api/templates/${encodeURIComponent(id)}`, body);
}

export async function deleteTemplate(id: string): Promise<{ message: string }> {
	return del<{ message: string }>(`/api/templates/${encodeURIComponent(id)}`);
}
