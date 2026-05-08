import { buildQueryString } from "../client/queryString";
import { del, get, patch, post } from "../client/http";
import type { ListResponse } from "../types/list";

/** Matches server: string (name or ObjectId), or plain object variants. */
export type AgreementCatalogFieldInput =
	| string
	| { name: string }
	| { _id: string }
	| { id: string };

export interface CreateAgreementConfigBody {
	agreement_category: AgreementCatalogFieldInput;
	agreement_domain: AgreementCatalogFieldInput;
	agreement_type: AgreementCatalogFieldInput;
	agreement_subtype: AgreementCatalogFieldInput;
	/** Non-empty; each entry is an existing AgreementStep ObjectId string. */
	steps: string[];
}

export interface AgreementConfiguredSection {
	name: string;
	/** FieldConfiguration ObjectId strings (populated response is collapsed to ids). */
	fields: string[];
}

/** One wizard step layout; `sections` omitted for steps like Authoring / Clauses per server rules. */
export interface AgreementConfiguredStep {
	/** AgreementStep ObjectId (same logical step as `steps[i]._id` when aligned by order). */
	id: string;
	name: string;
	sections?: AgreementConfiguredSection[];
}

/**
 * Single-document shape from `GET /api/agreement-configs/:id` (and create/PATCH responses normalized the same way).
 * When `isCompleted` and `configuredSteps.length > 0`, each step uses `id` (AgreementStep ObjectId) and optional `sections` with field id strings only.
 */
export interface AgreementConfigApi {
	_id: string;
	/** Human-readable id e.g. DAX-1; may be absent on legacy documents. */
	displayId?: string;
	agreement_category: { _id: string; name: string; createdAt?: string; updatedAt?: string };
	agreement_domain: {
		_id: string;
		name: string;
		category?: string;
		createdAt?: string;
		updatedAt?: string;
	};
	agreement_type: {
		_id: string;
		name: string;
		domain?: string;
		createdAt?: string;
		updatedAt?: string;
	};
	agreement_subtype: {
		_id: string;
		name: string;
		agreementType?: string;
		createdAt?: string;
		updatedAt?: string;
	};
	steps: Array<{ _id: string; name: string; createdAt?: string; updatedAt?: string }>;
	/** Teams linked to this configuration with wizard-style toggles (when supported by API). */
	relevantTeams?: AgreementRelevantTeamEntry[];
	/** false = Draft in UI */
	isActive?: boolean;
	isCompleted?: boolean;
	/** Present after configure; aligned with `steps` order. Omitted or empty until layout is saved. */
	configuredSteps?: AgreementConfiguredStep[];
	createdAt?: string;
	updatedAt?: string;
	/** User ObjectId when set. */
	createdBy?: string;
	/** User ObjectId when set. */
	updatedBy?: string;
	/** Optional Mongoose document version. */
	__v?: number;
}

export async function createAgreementConfig(body: CreateAgreementConfigBody): Promise<AgreementConfigApi> {
	return post<AgreementConfigApi>("/api/agreement-configs", body);
}

/** `GET /api/agreement-configs/:id` — session required; returns a single JSON object (not wrapped). */
export async function getAgreementConfigById(id: string): Promise<AgreementConfigApi> {
	return get<AgreementConfigApi>(`/api/agreement-configs/${encodeURIComponent(id)}`);
}

/** Settings per team on an agreement configuration (General → Relevant teams). */
export type AgreementRelevantTeamRef = string | { _id?: string; id?: string; name?: string };

export function resolveAgreementRelevantTeamId(team: AgreementRelevantTeamRef | null | undefined): string {
	if (typeof team === "string") return team.trim();
	if (!team || typeof team !== "object") return "";
	if (typeof team._id === "string" && team._id.trim()) return team._id.trim();
	if (typeof team.id === "string" && team.id.trim()) return team.id.trim();
	return "";
}

export interface AgreementRelevantTeamEntry {
	/** Team ObjectId */
	team: AgreementRelevantTeamRef;
	description?: string;
	addAllMembers?: boolean;
	canCreate?: boolean;
}

/** Build configure PATCH `relevantTeams` from ordered ids plus draft toggle overrides and persisted rows. */
export function buildAgreementRelevantTeamsPayload(
	cfg: AgreementConfigApi,
	draft: Readonly<Record<string, { addAllMembers: boolean; canCreate: boolean; description?: string }>>,
	relevantTeamIds: readonly string[]
): AgreementRelevantTeamEntry[] {
	const fromApiById = new Map<string, AgreementRelevantTeamEntry>();
	for (const row of cfg.relevantTeams ?? []) {
		const tid = resolveAgreementRelevantTeamId(row.team);
		if (!tid) continue;
		fromApiById.set(tid, row);
	}

	const seen = new Set<string>();
	const ordered: string[] = [];
	for (const raw of relevantTeamIds) {
		const tid = raw?.trim();
		if (!tid || seen.has(tid)) continue;
		seen.add(tid);
		ordered.push(tid);
	}

	return ordered.map((team) => {
		const fromApi = fromApiById.get(team);
		const d = draft[team];
		return {
			team,
			description: d?.description ?? fromApi?.description,
			addAllMembers: d?.addAllMembers ?? fromApi?.addAllMembers ?? false,
			canCreate: d?.canCreate ?? fromApi?.canCreate ?? false,
		};
	});
}

/** PATCH `/api/agreement-configs/:id/configure` — catalog refs and wizard `steps` in one body. */
export interface AgreementCatalogUpdateBody {
	agreement_category: AgreementCatalogFieldInput;
	agreement_domain: AgreementCatalogFieldInput;
	agreement_type: AgreementCatalogFieldInput;
	agreement_subtype: AgreementCatalogFieldInput;
	steps: AgreementConfigureStepRequest[];
	relevantTeams?: AgreementRelevantTeamEntry[];
}

export async function patchAgreementConfigCatalog(
	id: string,
	body: AgreementCatalogUpdateBody
): Promise<AgreementConfigApi> {
	return patch<AgreementConfigApi>(`/api/agreement-configs/${encodeURIComponent(id)}/configure`, body);
}

/** PATCH `/api/agreement-configs/:id` — set draft vs active (server may enforce extra rules). */
export async function patchAgreementConfigActivation(
	id: string,
	body: { isActive: boolean }
): Promise<AgreementConfigApi> {
	return patch<AgreementConfigApi>(`/api/agreement-configs/${encodeURIComponent(id)}`, body);
}

/** Lean list row from GET /api/agreement-configs (configuredSteps uses `step`, not `id`). */
export interface AgreementConfigListConfiguredSection {
	name: string;
	fields: string[];
}

export interface AgreementConfigListConfiguredStep {
	step: string;
	name: string;
	sections?: AgreementConfigListConfiguredSection[];
}

export interface AgreementConfigListItem {
	_id: string;
	displayId?: string;
	agreement_category: { _id: string; name: string };
	agreement_domain: { _id: string; name: string };
	agreement_type: { _id: string; name: string };
	agreement_subtype: { _id: string; name: string };
	steps: Array<{ _id: string; name: string }>;
	isActive?: boolean;
	isCompleted?: boolean;
	createdBy?: string;
	updatedBy?: string;
	createdAt?: string;
	updatedAt?: string;
	configuredSteps?: AgreementConfigListConfiguredStep[];
}

export interface AgreementConfigsListParams {
	page?: number;
	limit?: number;
	/** displayId, createdAt, updatedAt, isActive, isCompleted; prefix `-` for descending. */
	sort?: string;
	search?: string;
	q?: string;
	displayId?: string;
	agreement_category?: string;
	agreement_domain?: string;
	agreement_type?: string;
	agreement_subtype?: string;
	isActive?: boolean;
	isCompleted?: boolean;
	createdAfter?: string;
	createdBefore?: string;
}

function boolQuery(value: boolean | undefined): string | undefined {
	if (value === undefined) return undefined;
	return value ? "true" : "false";
}

export async function listAgreementConfigs(
	params: AgreementConfigsListParams
): Promise<ListResponse<AgreementConfigListItem>> {
	const qs = buildQueryString({
		page: params.page,
		limit: params.limit,
		sort: params.sort,
		search: params.search?.trim(),
		q: params.q?.trim(),
		displayId: params.displayId?.trim(),
		agreement_category: params.agreement_category?.trim(),
		agreement_domain: params.agreement_domain?.trim(),
		agreement_type: params.agreement_type?.trim(),
		agreement_subtype: params.agreement_subtype?.trim(),
		isActive: boolQuery(params.isActive),
		isCompleted: boolQuery(params.isCompleted),
		createdAfter: params.createdAfter?.trim(),
		createdBefore: params.createdBefore?.trim(),
	});
	return get<ListResponse<AgreementConfigListItem>>(`/api/agreement-configs${qs}`);
}

/** PATCH /api/agreement-configs/:id/configure — wizard layout; allowed when draft or already completed; sets isCompleted true on success. */
export interface AgreementConfigureSectionRequest {
	name: string;
	fields: string[];
}

export interface AgreementConfigureStepRequest {
	id: string;
	name: string;
	sections?: AgreementConfigureSectionRequest[];
}

export interface AgreementConfigureRequestBody {
	steps?: AgreementConfigureStepRequest[];
	relevantTeams?: AgreementRelevantTeamEntry[];
}

export async function configureAgreementConfig(
	id: string,
	body: AgreementConfigureRequestBody
): Promise<AgreementConfigApi> {
	return patch<AgreementConfigApi>(`/api/agreement-configs/${encodeURIComponent(id)}/configure`, body);
}

/** DELETE /api/agreement-configs/:id — hard-deletes the config document. */
export interface DeleteAgreementConfigResponse {
	message: string;
}

export async function deleteAgreementConfig(id: string): Promise<DeleteAgreementConfigResponse> {
	return del<DeleteAgreementConfigResponse>(`/api/agreement-configs/${encodeURIComponent(id)}`);
}

/** POST /api/agreement-configs/bulk-delete — max 100 unique ObjectIds. */
export interface BulkDeleteAgreementConfigsResponse {
	message: string;
	deletedCount: number;
	requestedCount: number;
}

export async function bulkDeleteAgreementConfigs(
	ids: string[]
): Promise<BulkDeleteAgreementConfigsResponse> {
	return post<BulkDeleteAgreementConfigsResponse>("/api/agreement-configs/bulk-delete", { ids });
}
