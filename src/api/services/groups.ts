import { del, get, patch, post } from "../client/http";
import { buildQueryString } from "../client/queryString";
import type { BaseListQuery, ListResponse } from "../types/list";
import type { BulkDeleteResult } from "../types/bulkDelete";
import type { Group } from "../../schemas/group";

/** Document returned by POST /api/groups (201). */
export interface GroupApiDocument {
	_id: string;
	name: string;
	description: string;
	userCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateGroupBody {
	name: string;
	description?: string;
	userCount?: number;
}

/** PATCH /api/groups/:id */
export interface UpdateGroupBody {
	name: string;
	description?: string;
}

export function mapGroupFromApi(doc: GroupApiDocument): Group {
	return {
		id: doc._id,
		name: doc.name,
		description: doc.description ?? "",
		numberOfUsers: doc.userCount ?? 0,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export async function createGroup(body: CreateGroupBody): Promise<Group> {
	const payload = {
		name: body.name,
		description: body.description ?? "",
		userCount: Math.max(0, body.userCount ?? 0),
	};
	const doc = await post<GroupApiDocument>("/api/groups", payload);
	return mapGroupFromApi(doc);
}

export async function updateGroup(id: string, body: UpdateGroupBody): Promise<Group> {
	const payload = {
		name: body.name,
		description: body.description ?? "",
	};
	const doc = await patch<GroupApiDocument>(`/api/groups/${encodeURIComponent(id)}`, payload);
	return mapGroupFromApi(doc);
}

export async function deleteGroup(id: string): Promise<void> {
	await del(`/api/groups/${encodeURIComponent(id)}`);
}

export async function bulkDeleteGroups(ids: string[]): Promise<BulkDeleteResult> {
	const unique = [...new Set(ids)];
	return post<BulkDeleteResult>("/api/groups/bulk-delete", { ids: unique });
}

export interface ListGroupsParams extends BaseListQuery {
	name?: string;
	description?: string;
}

export async function listGroups(params: ListGroupsParams = {}): Promise<ListResponse<Group>> {
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
	const raw = await get<ListResponse<GroupApiDocument>>(`/api/groups${qs}`);
	return {
		data: raw.data.map(mapGroupFromApi),
		pagination: raw.pagination,
	};
}
