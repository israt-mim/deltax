import { ApiError, del, get, patch, post, request } from "../client/http";
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
	agreementConfigId?: string;
	agreementConfigDisplayId?: string;
	steps?: Array<{ id: string; name: string; catalogStepName?: string | null }>;
}

/** POST /api/agreements */
export async function createAgreement(body: CreateAgreementBody): Promise<CreateAgreementResponse> {
	return post<CreateAgreementResponse>("/api/agreements", body);
}

/** Step from `GET /api/agreements/:id/steps` (wizard navigation). */
export interface AgreementDocumentStep {
	id: string;
	name: string;
	/** Catalog template step name when distinct from display `name`. */
	catalogStepName?: string | null;
}

export interface GetAgreementStepsResponse {
	steps: AgreementDocumentStep[];
}

/** GET /api/agreements/:id/steps */
export async function getAgreementSteps(agreementId: string): Promise<GetAgreementStepsResponse> {
	return get<GetAgreementStepsResponse>(`/api/agreements/${encodeURIComponent(agreementId)}/steps`);
}

/** Populated user reference returned by the dashboard endpoint. */
export interface AgreementDashboardUser {
	_id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	username?: string;
	profilePictureUrl?: string | null;
}

/** Populated catalog reference (category/domain/type/subtype) returned by the dashboard endpoint. */
export interface AgreementDashboardCatalogRef {
	_id: string;
	name?: string;
}

/** Shape returned by GET /api/agreements/:id/dashboard. */
export interface AgreementDashboardData {
	id: string;
	displayId: string;
	agreement_display_name: string;
	status: string;
	createdAt?: string;
	updatedAt?: string;
	createdBy?: AgreementDashboardUser | null;
	updatedBy?: AgreementDashboardUser | null;
	agreement_category?: AgreementDashboardCatalogRef | null;
	agreement_domain?: AgreementDashboardCatalogRef | null;
	agreement_type?: AgreementDashboardCatalogRef | null;
	agreement_subtype?: AgreementDashboardCatalogRef | null;
}

export interface AgreementDashboardEnvelope {
	data: AgreementDashboardData | null;
}

/** GET /api/agreements/:id/dashboard — lightweight agreement summary for headers/dashboards. */
export async function getAgreementDashboard(agreementId: string): Promise<AgreementDashboardData> {
	const body = await get<AgreementDashboardEnvelope>(
		`/api/agreements/${encodeURIComponent(agreementId)}/dashboard`
	);
	if (!body.data) {
		throw new ApiError("Agreement not found", 404, body);
	}
	return body.data;
}

export interface AgreementTeamUser {
	_id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	username?: string;
	profilePictureUrl?: string | null;
}

export interface AgreementTeamRef {
	_id: string;
	name?: string;
	description?: string;
	userCount?: number;
	groupTechnicalName?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface AgreementTeamMember {
	user: AgreementTeamUser | null;
}

export interface AgreementTeamEntry {
	id: string;
	team: AgreementTeamRef | null;
	description?: string;
	addAllMembersFromConfig?: boolean;
	memberCount?: number;
	members?: AgreementTeamMember[];
}

export interface AgreementTeamsData {
	teams: AgreementTeamEntry[];
}

export interface AgreementTeamsEnvelope {
	data: AgreementTeamsData | null;
}

export interface PatchAgreementTeamMembersBody {
	add?: string[];
	remove?: string[];
}

export interface PatchAgreementTeamMembersResponse {
	message: string;
	team: AgreementTeamEntry;
}

/** GET /api/agreements/:id/teams — agreement team snapshots with attached members. */
export async function getAgreementTeams(agreementId: string): Promise<AgreementTeamsData> {
	const body = await get<AgreementTeamsEnvelope>(`/api/agreements/${encodeURIComponent(agreementId)}/teams`);
	if (!body.data) {
		throw new ApiError("Agreement not found", 404, body);
	}
	return body.data;
}

export interface AgreementAttachmentUser {
	_id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	username?: string;
	profilePictureUrl?: string | null;
}

export type AgreementAttachmentKind = "file" | "folder";

export interface AgreementAttachment {
	id: string;
	kind: AgreementAttachmentKind;
	name: string;
	parentFolderId?: string | null;
	tags?: string[];
	attachmentUrl?: string | null;
	originalFileName?: string;
	contentType?: string;
	size?: number;
	createdBy?: AgreementAttachmentUser | null;
	modifiedBy?: AgreementAttachmentUser | null;
	uploadedBy?: AgreementAttachmentUser | null;
	createdAt?: string;
	modifiedAt?: string;
}

export interface AgreementAttachmentsData {
	attachments: AgreementAttachment[];
	parentFolderId?: string | null;
}

export interface AgreementAttachmentsEnvelope {
	data: AgreementAttachmentsData | null;
}

export interface UploadAgreementAttachmentsResponse {
	message: string;
	attachments: AgreementAttachment[];
}

export interface CreateAgreementAttachmentFolderBody {
	name: string;
	tags?: string[];
	parentFolderId?: string | null;
}

export interface CreateAgreementAttachmentFolderResponse {
	message: string;
	attachment: AgreementAttachment;
}

export interface UpdateAgreementAttachmentBody {
	name?: string;
	tags?: string[];
}

export interface UpdateAgreementAttachmentResponse {
	message: string;
	attachment: AgreementAttachment;
}

/** GET /api/agreements/:id/attachments */
export async function getAgreementAttachments(
	agreementId: string,
	params?: { parentFolderId?: string | null }
): Promise<AgreementAttachmentsData> {
	const qs =
		params?.parentFolderId != null && params.parentFolderId !== ""
			? `?parentFolderId=${encodeURIComponent(params.parentFolderId)}`
			: "";
	const body = await get<AgreementAttachmentsEnvelope>(
		`/api/agreements/${encodeURIComponent(agreementId)}/attachments${qs}`
	);
	if (!body.data) {
		throw new ApiError("Agreement not found", 404, body);
	}
	return body.data;
}

/** POST /api/agreements/:id/attachments/folders */
export async function createAgreementAttachmentFolder(
	agreementId: string,
	body: CreateAgreementAttachmentFolderBody
): Promise<AgreementAttachment> {
	const res = await post<CreateAgreementAttachmentFolderResponse>(
		`/api/agreements/${encodeURIComponent(agreementId)}/attachments/folders`,
		body
	);
	return res.attachment;
}

/** POST /api/agreements/:id/attachments/upload — multipart field `files` (multiple). */
export async function uploadAgreementAttachments(
	agreementId: string,
	files: File[],
	options?: { parentFolderId?: string | null; tags?: string[] }
): Promise<AgreementAttachment[]> {
	const formData = new FormData();
	for (const file of files) {
		formData.append("files", file);
	}
	if (options?.parentFolderId) {
		formData.append("parentFolderId", options.parentFolderId);
	}
	if (options?.tags?.length) {
		formData.append("tags", JSON.stringify(options.tags));
	}
	const res = await request<UploadAgreementAttachmentsResponse>(
		"POST",
		`/api/agreements/${encodeURIComponent(agreementId)}/attachments/upload`,
		{ body: formData }
	);
	return res.attachments;
}

/** POST /api/agreements/:id/attachments — single file (`file` field), backward compatible. */
export async function uploadAgreementAttachment(
	agreementId: string,
	file: File,
	options?: { name?: string; parentFolderId?: string | null }
): Promise<AgreementAttachment> {
	const formData = new FormData();
	formData.append("file", file);
	if (options?.name?.trim()) {
		formData.append("name", options.name.trim());
	}
	if (options?.parentFolderId) {
		formData.append("parentFolderId", options.parentFolderId);
	}
	const res = await request<UploadAgreementAttachmentsResponse>(
		"POST",
		`/api/agreements/${encodeURIComponent(agreementId)}/attachments`,
		{ body: formData }
	);
	return res.attachments[0];
}

/** PATCH /api/agreements/:id/attachments/:attachmentId — rename display name. */
export async function updateAgreementAttachment(
	agreementId: string,
	attachmentId: string,
	body: UpdateAgreementAttachmentBody
): Promise<AgreementAttachment> {
	const res = await patch<UpdateAgreementAttachmentResponse>(
		`/api/agreements/${encodeURIComponent(agreementId)}/attachments/${encodeURIComponent(attachmentId)}`,
		body
	);
	return res.attachment;
}

/** DELETE /api/agreements/:id/attachments/:attachmentId */
export async function deleteAgreementAttachment(
	agreementId: string,
	attachmentId: string
): Promise<{ message: string }> {
	return del<{ message: string }>(
		`/api/agreements/${encodeURIComponent(agreementId)}/attachments/${encodeURIComponent(attachmentId)}`
	);
}

/** PATCH /api/agreements/:id/teams/:teamId/members — add/remove members for one agreement team. */
export async function patchAgreementTeamMembers(
	agreementId: string,
	teamId: string,
	body: PatchAgreementTeamMembersBody
): Promise<PatchAgreementTeamMembersResponse> {
	return patch<PatchAgreementTeamMembersResponse>(
		`/api/agreements/${encodeURIComponent(agreementId)}/teams/${encodeURIComponent(teamId)}/members`,
		body
	);
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

/** Line Items GET …/details?of=line-items — ordered grid columns. */
export interface AgreementLineItemsTableColumn {
	fieldId: string;
	sectionName?: string;
	label?: string;
	width?: number;
	sortable?: boolean;
}

/** One grid row: `id` is the line-item subdocument `_id`. */
export interface AgreementLineItemsTableRow {
	id: string;
	rowIndex?: number;
	cells: Record<string, unknown>;
}

export interface AgreementLineItemsTableBlock {
	columns: AgreementLineItemsTableColumn[];
	rows: AgreementLineItemsTableRow[];
}

export interface AgreementLineItemsLayoutBlock {
	sections: AgreementStepDetailsSection[];
}

export interface AgreementStepDetailsMeta {
	contentMode?: string;
	editorMode?: string;
	editorHideWizardNav?: boolean;
}

/** Clause row returned on GET …/details (clause step) or PATCH …/clauses. */
export interface AgreementClauseBrief {
	id: string;
	displayId?: string;
	isActive?: boolean;
	title?: string;
	category?: string;
	text?: string;
	language?: string;
}

export interface AgreementStepDetailsData {
	/** Column / section definitions (normalized from `layout.sections` when present). */
	sections: AgreementStepDetailsSection[];
	/** Raw layout block from Line Items GET (optional). */
	layout?: AgreementLineItemsLayoutBlock | null;
	/** Table-friendly shape for the Line Items grid. */
	table?: AgreementLineItemsTableBlock | null;
	step?: { id: string; name: string; catalogStepName?: string | null } | null;
	agreementConfigId: string;
	agreementConfigDisplayId?: string;
	/** Server-resolved slug for PATCH …/field-values `of` (e.g. `header`, `line-items`). */
	ofKey?: string;
	clauses?: AgreementClauseBrief[];
	/** Full line-item rows for accordion list (Line Items step). */
	lineItems?: unknown[] | null;
	/** Single line item when `lineItemId` query is set (new/edit editor). */
	lineItem?: unknown | null;
	meta?: AgreementStepDetailsMeta | null;
}

/** One step block under GET /api/agreements/:id/details with no `of` query. */
export interface AgreementWizardStepBlock {
	sections?: AgreementStepDetailsSection[];
	step?: { id: string; name: string; catalogStepName?: string | null } | null;
	ofKey?: string;
	clauses?: AgreementClauseBrief[];
	agreementConfigId?: string;
	agreementConfigDisplayId?: string;
}

export interface AgreementWizardFullData {
	steps: Record<string, AgreementWizardStepBlock>;
	agreementConfigId: string;
	agreementConfigDisplayId?: string;
}

export interface AgreementWizardFullEnvelope {
	data: AgreementWizardFullData | null;
	status: string;
	message?: string;
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

function slugStepName(name: string | undefined | null): string {
	return (name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Stable URL/tab key for agreement wizard steps (not the step ObjectId). */
export function agreementTabKeyFromStep(step: {
	id: string;
	name: string;
	catalogStepName?: string | null;
}): string {
	const id = step.id?.trim() ?? "";
	if (id === "__agreement-dashboard__") return "dashboard";
	if (id === "__agreement-teams__") return "teams";
	if (id === "__agreement-attachments__") return "attachments";
	const fromCatalog = slugStepName(step.catalogStepName);
	if (fromCatalog) return fromCatalog;
	return slugStepName(step.name);
}

export type AgreementTabDescriptor = {
	key: string;
	step: AgreementDocumentStep;
};

/** Build tab list with unique slug keys for UI + `?tab=` routing. */
export function buildAgreementTabDescriptors(
	steps: AgreementDocumentStep[],
	options?: {
		dashboardStep?: AgreementDocumentStep;
		teamsStep?: AgreementDocumentStep;
		attachmentsStep?: AgreementDocumentStep;
	}
): AgreementTabDescriptor[] {
	const dashboardStep = options?.dashboardStep ?? {
		id: "__agreement-dashboard__",
		name: "Dashboard",
		catalogStepName: "Dashboard",
	};
	const teamsStep = options?.teamsStep ?? {
		id: "__agreement-teams__",
		name: "Teams",
		catalogStepName: "Teams",
	};
	const attachmentsStep = options?.attachmentsStep ?? {
		id: "__agreement-attachments__",
		name: "Attachments",
		catalogStepName: "Attachments",
	};
	const allSteps = [dashboardStep, ...steps, teamsStep, attachmentsStep];
	const used = new Set<string>();

	return allSteps.map((step, index) => {
		let key = agreementTabKeyFromStep(step);
		if (!key) key = `step-${index + 1}`;
		if (used.has(key)) {
			let suffix = 2;
			while (used.has(`${key}-${suffix}`)) suffix += 1;
			key = `${key}-${suffix}`;
		}
		used.add(key);
		return { key, step };
	});
}

/** Resolve `?tab=` from slug key or legacy step ObjectId. */
export function resolveAgreementTabKeyFromUrl(
	urlTab: string,
	tabs: AgreementTabDescriptor[]
): string | null {
	const trimmed = urlTab.trim();
	if (!trimmed) return null;
	if (tabs.some((t) => t.key === trimmed)) return trimmed;
	const legacyById = tabs.find((t) => t.step.id === trimmed);
	return legacyById?.key ?? null;
}

/** True when the loaded step is the Header step (PATCH `of` should be `"header"`). */
export function isHeaderAgreementStep(
	details: AgreementStepDetailsData,
	step: { id: string; name: string }
): boolean {
	const ofKey = (details.ofKey ?? "").trim().toLowerCase();
	if (ofKey === "header") return true;
	if (slugStepName(step.name) === "header") return true;
	if (slugStepName(details.step?.name) === "header") return true;
	if (slugStepName(details.step?.catalogStepName ?? undefined) === "header") return true;
	return false;
}

/**
 * `of` for PATCH /api/agreements/:id/field-values — use literal `"header"` on the header step for clarity.
 */
export function fieldValuesPatchOfParam(
	details: AgreementStepDetailsData,
	step: { id: string; name: string }
): string {
	if (isHeaderAgreementStep(details, step)) return "header";
	const k = details.ofKey?.trim();
	if (k) return k;
	return agreementStepDetailsOfQuery(step);
}

/** Wizard / details step is the Clauses library step (not field-values PATCH). */
export function isClausesAgreementStep(
	details: AgreementStepDetailsData | null,
	step: { id: string; name: string } | null | undefined
): boolean {
	if (!step) return false;
	const stepSlug = slugStepName(step.name);
	if (stepSlug === "clauses" || stepSlug === "clause") return true;
	if (!details) return false;
	const ok = (details.ofKey ?? "").trim().toLowerCase();
	if (ok === "clauses" || ok === "clause") return true;
	if (slugStepName(details.step?.name) === "clauses" || slugStepName(details.step?.name) === "clause") {
		return true;
	}
	return false;
}

/** True when the wizard step label indicates Clauses (use before details load). */
export function isClausesWizardStepName(step: { name: string } | null | undefined): boolean {
	if (!step) return false;
	const s = slugStepName(step.name);
	return s === "clauses" || s === "clause";
}

/** True when the wizard step is the Line Items repeater (before details load). */
export function isLineItemsWizardStepName(
	step: { name: string; catalogStepName?: string | null } | null | undefined
): boolean {
	if (!step) return false;
	const s = slugStepName(step.name);
	const c = slugStepName(step.catalogStepName ?? undefined);
	return s === "lineitems" || s === "lineitem" || c === "lineitems" || c === "lineitem";
}

/** True when loaded step details correspond to the Line Items repeater. */
export function isLineItemsAgreementStep(
	details: AgreementStepDetailsData | null,
	step: { name: string; catalogStepName?: string | null } | null | undefined
): boolean {
	if (!details && !step) return false;
	if (details?.meta?.contentMode && slugStepName(details.meta.contentMode) === "lineitems") return true;
	const ok = slugStepName(details?.ofKey ?? undefined);
	if (ok === "lineitems" || ok === "lineitem") return true;
	if (step && isLineItemsWizardStepName(step)) return true;
	if (details?.step && isLineItemsWizardStepName(details.step)) return true;
	return false;
}

/** Whether wizard prev/next should be hidden (Line Items editor query modes). */
export function agreementStepEditorHideWizardNav(details: AgreementStepDetailsData | null): boolean {
	return Boolean(details?.meta?.editorHideWizardNav);
}

function coalesceSectionsFromPayload(d: Record<string, unknown>): AgreementStepDetailsSection[] {
	const layout = d.layout as { sections?: AgreementStepDetailsSection[] } | undefined;
	if (layout?.sections && Array.isArray(layout.sections)) return layout.sections;
	const root = d.sections;
	if (Array.isArray(root)) return root as AgreementStepDetailsSection[];
	return [];
}

export function normalizeAgreementStepDetailsData(d: Record<string, unknown>): AgreementStepDetailsData {
	const sections = coalesceSectionsFromPayload(d);
	const rawTable = d.table as AgreementLineItemsTableBlock | null | undefined;
	const table =
		rawTable && Array.isArray(rawTable.columns) && Array.isArray(rawTable.rows)
			? { columns: rawTable.columns, rows: rawTable.rows }
			: null;
	const layoutRaw = d.layout as AgreementLineItemsLayoutBlock | null | undefined;
	const layout =
		layoutRaw && Array.isArray(layoutRaw.sections)
			? { sections: layoutRaw.sections }
			: sections.length > 0
				? { sections }
				: null;

	return {
		sections,
		layout,
		table,
		step: (d.step as AgreementStepDetailsData["step"]) ?? null,
		agreementConfigId: String(d.agreementConfigId ?? ""),
		agreementConfigDisplayId: typeof d.agreementConfigDisplayId === "string" ? d.agreementConfigDisplayId : undefined,
		ofKey: typeof d.ofKey === "string" ? d.ofKey : undefined,
		clauses: Array.isArray(d.clauses) ? (d.clauses as AgreementClauseBrief[]) : undefined,
		lineItems: Array.isArray(d.lineItems) ? d.lineItems : d.lineItems === null ? null : undefined,
		lineItem: "lineItem" in d ? (d.lineItem as unknown) : undefined,
		meta:
			d.meta && typeof d.meta === "object" && !Array.isArray(d.meta)
				? (d.meta as AgreementStepDetailsMeta)
				: null,
	};
}

/**
 * Authoring and Modification steps are hidden from the **new agreement** wizard
 * (`/agreements/create/:id`). Full agreement details (`GET …/details` without step filter)
 * still returns every step for post-creation editing.
 */
export function isAuthoringOrModificationAgreementCreationStep(step: AgreementDocumentStep): boolean {
	const slugs = [slugStepName(step.catalogStepName ?? undefined), slugStepName(step.name)].filter(
		(s) => s.length > 0
	);
	return slugs.some((s) => s === "authoring" || s === "modification" || s === "modifications");
}

export interface GetAgreementStepDetailsOptions {
	/**
	 * Omit or `"list"` — main Line Items table (wizard nav stays).
	 * `"new"` — create editor (`meta.editorHideWizardNav`).
	 * Line-item `_id` — edit that row.
	 */
	lineItemId?: string | null;
}

/** GET /api/agreements/:id/details?of=…&lineItemId=… */
export async function getAgreementStepDetails(
	agreementId: string,
	of: string,
	options?: GetAgreementStepDetailsOptions
): Promise<AgreementStepDetailsData> {
	const trimmed = of.trim();
	if (!trimmed) {
		throw new ApiError("Step reference (of) is required.", 400, undefined);
	}
	const params: Record<string, string | number | undefined | null> = { of: trimmed };
	const lid = options?.lineItemId?.trim();
	if (lid && lid.toLowerCase() !== "list") {
		params.lineItemId = lid;
	}
	const qs = buildQueryString(params);
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
	const d = body.data as unknown as Record<string, unknown>;
	return normalizeAgreementStepDetailsData(d);
}

/** GET /api/agreements/:id/details — full wizard payload (all steps + clauses bundle). */
export async function getAgreementWizardDetails(agreementId: string): Promise<AgreementWizardFullData> {
	const body = await get<AgreementWizardFullEnvelope>(
		`/api/agreements/${encodeURIComponent(agreementId)}/details`
	);
	if (body.status !== "success" || body.data == null) {
		const msg =
			typeof body.message === "string" && body.message.trim()
				? body.message.trim()
				: "Could not load agreement wizard details.";
		throw new ApiError(msg, 400, body);
	}
	return body.data;
}

export interface PatchAgreementFieldValueItem {
	field?: string;
	fieldId?: string;
	value?: unknown;
	remove?: boolean;
	clear?: boolean;
}

export interface PatchAgreementFieldValuesBody {
	/** Step key; defaults server-side to `header` when omitted. Must not be `clauses` or Line Items. */
	of?: string;
	/** Flat field updates for the step layout. */
	values?: PatchAgreementFieldValueItem[];
}

export type PatchAgreementFieldValuesResponse =
	| { message: string; agreementStepSnapshots?: unknown[] }
	| { message: string; fieldValues?: Array<{ field: string; value: unknown }> };

/** PATCH /api/agreements/:id/field-values — persist field values for one non-clause step. */
export async function patchAgreementFieldValues(
	agreementId: string,
	body: PatchAgreementFieldValuesBody
): Promise<PatchAgreementFieldValuesResponse> {
	return patch<PatchAgreementFieldValuesResponse>(
		`/api/agreements/${encodeURIComponent(agreementId)}/field-values`,
		body
	);
}

export interface PatchAgreementClausesBody {
	add?: string[];
	remove?: string[];
}

export interface AgreementClauseRefEntry {
	clause?: AgreementClauseBrief;
}

export interface PatchAgreementClausesResponse {
	message: string;
	clauseRefs?: AgreementClauseRefEntry[];
	clauses?: AgreementClauseBrief[];
}

/** PATCH /api/agreements/:id/clauses — ordered clause refs on the agreement. */
export async function patchAgreementClauses(
	agreementId: string,
	body: PatchAgreementClausesBody
): Promise<PatchAgreementClausesResponse> {
	return patch<PatchAgreementClausesResponse>(
		`/api/agreements/${encodeURIComponent(agreementId)}/clauses`,
		body
	);
}

export interface AgreementClausesListParams {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
	q?: string;
}

function normalizeAgreementClausesListResponse(body: unknown): ListResponse<AgreementClauseBrief> {
	if (
		body &&
		typeof body === "object" &&
		"pagination" in body &&
		Array.isArray((body as ListResponse<AgreementClauseBrief>).data)
	) {
		return body as ListResponse<AgreementClauseBrief>;
	}
	if (body && typeof body === "object" && "status" in body && "data" in body) {
		const envelope = body as { status?: string; data?: unknown; message?: string };
		const d = envelope.data;
		if (d && typeof d === "object") {
			const record = d as Record<string, unknown>;
			if (Array.isArray(record.data) && record.pagination && typeof record.pagination === "object") {
				return {
					data: record.data as AgreementClauseBrief[],
					pagination: record.pagination as ListResponse<AgreementClauseBrief>["pagination"],
				};
			}
			if (Array.isArray(record.clauses) && record.pagination && typeof record.pagination === "object") {
				return {
					data: record.clauses as AgreementClauseBrief[],
					pagination: record.pagination as ListResponse<AgreementClauseBrief>["pagination"],
				};
			}
		}
		const msg =
			typeof envelope.message === "string" && envelope.message.trim()
				? envelope.message.trim()
				: "Could not load agreement clauses.";
		throw new ApiError(msg, 400, body);
	}
	throw new ApiError("Could not load agreement clauses.", 400, body);
}

/** GET /api/agreements/:id/clauses — paginated clauses attached to this agreement. */
export async function listAgreementClauses(
	agreementId: string,
	params: AgreementClausesListParams = {}
): Promise<ListResponse<AgreementClauseBrief>> {
	const qs = buildQueryString({
		page: params.page,
		limit: params.limit,
		sort: params.sort?.trim(),
		search: params.search?.trim(),
		q: params.q?.trim(),
	});
	const body = await get<unknown>(
		`/api/agreements/${encodeURIComponent(agreementId)}/clauses${qs}`
	);
	return normalizeAgreementClausesListResponse(body);
}

/** Walks paginated clause list until all attached clause ids are collected. */
export async function fetchAllAgreementClauseIds(agreementId: string): Promise<Set<string>> {
	const ids = new Set<string>();
	let page = 1;
	for (;;) {
		const res = await listAgreementClauses(agreementId, { page, limit: 100, sort: "-createdAt" });
		for (const clause of res.data) {
			const id = clause.id?.trim();
			if (id) ids.add(id);
		}
		if (!res.pagination.hasNextPage) break;
		page += 1;
	}
	return ids;
}

export interface PostAgreementLineItemBody {
	values?: PatchAgreementFieldValueItem[];
}

export interface PostAgreementLineItemResponse {
	message?: string;
	id?: string;
	lineItemId?: string;
	/** Some APIs return Mongo id here after create. */
	_id?: string;
}

/** POST /api/agreements/:id/line-items */
export async function postAgreementLineItem(
	agreementId: string,
	body?: PostAgreementLineItemBody
): Promise<PostAgreementLineItemResponse> {
	return post<PostAgreementLineItemResponse>(
		`/api/agreements/${encodeURIComponent(agreementId)}/line-items`,
		body ?? {}
	);
}

export interface PatchAgreementLineItemBody {
	values: PatchAgreementFieldValueItem[];
}

export type PatchAgreementLineItemResponse = { message?: string } & Record<string, unknown>;

/** PATCH /api/agreements/:id/line-items/:lineItemId */
export async function patchAgreementLineItem(
	agreementId: string,
	lineItemId: string,
	body: PatchAgreementLineItemBody
): Promise<PatchAgreementLineItemResponse> {
	return patch<PatchAgreementLineItemResponse>(
		`/api/agreements/${encodeURIComponent(agreementId)}/line-items/${encodeURIComponent(lineItemId)}`,
		body
	);
}

export type DeleteAgreementLineItemResponse = { message?: string } & Record<string, unknown>;

/** DELETE /api/agreements/:id/line-items/:lineItemId */
export async function deleteAgreementLineItem(
	agreementId: string,
	lineItemId: string
): Promise<DeleteAgreementLineItemResponse> {
	return del<DeleteAgreementLineItemResponse>(
		`/api/agreements/${encodeURIComponent(agreementId)}/line-items/${encodeURIComponent(lineItemId)}`
	);
}

/**
 * Build PATCH …/field-values `values` for every field on the step layout (visible or not).
 * Uses `values[fieldId]` when the user edited the field, otherwise the template `f.value`.
 */
export function buildAgreementFieldValuesPatchList(
	details: AgreementStepDetailsData,
	values: Record<string, unknown>
): PatchAgreementFieldValueItem[] {
	const out: PatchAgreementFieldValueItem[] = [];
	for (const sec of details.sections ?? []) {
		for (const f of sec.fields ?? []) {
			const id = f.id?.trim();
			if (!id) continue;
			const v = Object.prototype.hasOwnProperty.call(values, id) ? values[id] : f.value;
			out.push({ field: id, value: v });
		}
	}
	return out;
}

/** True when this step has field sections to PATCH (not the clauses library step). */
export function isAgreementFieldValuesStep(details: AgreementStepDetailsData | null): boolean {
	if (!details) return false;
	const key = (details.ofKey ?? "").toLowerCase();
	if (key === "clauses" || key === "clause") return false;
	if (isLineItemsAgreementStep(details, details.step ?? undefined)) return false;
	return (details.sections ?? []).some((s) => (s.fields ?? []).length > 0);
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
	profilePictureUrl?: string | null;
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
