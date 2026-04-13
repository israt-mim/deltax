import { del, get, patch, post } from "../client/http";
import { buildQueryString } from "../client/queryString";
import type { BaseListQuery, ListResponse } from "../types/list";
import type { BulkDeleteResult } from "../types/bulkDelete";
import type { Team } from "../../schemas/team";

/** Document returned by POST /api/teams (201). */
export interface TeamApiDocument {
	_id: string;
	name: string;
	description: string;
	userCount: number;
	groupTechnicalName?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateTeamBody {
	name: string;
	description?: string;
	userCount?: number;
}

/** PATCH /api/teams/:id — name / description only (per API rules). */
export interface UpdateTeamBody {
	name: string;
	description?: string;
}

export function mapTeamFromApi(doc: TeamApiDocument): Team {
	return {
		id: doc._id,
		name: doc.name,
		description: doc.description ?? "",
		numberOfUsers: doc.userCount ?? 0,
		...(doc.groupTechnicalName !== undefined && doc.groupTechnicalName !== ""
			? { groupTechnicalName: doc.groupTechnicalName }
			: {}),
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export interface ListTeamsParams extends BaseListQuery {
	name?: string;
	description?: string;
}

export async function listTeams(params: ListTeamsParams = {}): Promise<ListResponse<Team>> {
	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(100, Math.max(1, params.limit ?? 10));
	const qs = buildQueryString({
		page,
		limit,
		sort: params.sort,
		q: params.q,
		search: params.search,
		name: params.name,
		description: params.description,
		createdAfter: params.createdAfter,
		createdBefore: params.createdBefore,
	});
	const raw = await get<ListResponse<TeamApiDocument>>(`/api/teams${qs}`);
	return {
		data: raw.data.map(mapTeamFromApi),
		pagination: raw.pagination,
	};
}

export async function createTeam(body: CreateTeamBody): Promise<Team> {
	const payload = {
		name: body.name,
		description: body.description ?? "",
		userCount: Math.max(0, body.userCount ?? 0),
	};
	const doc = await post<TeamApiDocument>("/api/teams", payload);
	return mapTeamFromApi(doc);
}

export async function updateTeam(id: string, body: UpdateTeamBody): Promise<Team> {
	const payload = {
		name: body.name,
		description: body.description ?? "",
	};
	const doc = await patch<TeamApiDocument>(`/api/teams/${encodeURIComponent(id)}`, payload);
	return mapTeamFromApi(doc);
}

export async function deleteTeam(id: string): Promise<void> {
	await del(`/api/teams/${encodeURIComponent(id)}`);
}

export async function bulkDeleteTeams(ids: string[]): Promise<BulkDeleteResult> {
	const unique = [...new Set(ids)];
	return post<BulkDeleteResult>("/api/teams/bulk-delete", { ids: unique });
}
