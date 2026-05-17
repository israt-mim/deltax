import type { AuthUser } from "./auth";
import { del, get, patch, post, request } from "../client/http";
import type { BulkDeleteResult } from "../types/bulkDelete";
import { buildQueryString } from "../client/queryString";
import type { BaseListQuery, ListResponse } from "../types/list";
import type { SettingsUserListRow } from "../../schemas/settingsUser";

export interface CreateUserBody {
	firstName: string;
	lastName: string;
	email: string;
	/** MongoDB ObjectId string for a group */
	group: string;
	/** At least one team ObjectId */
	teams: string[];
	mustChangePassword: boolean;
}

export interface CreatedUserApi {
	_id: string;
	firstName?: string;
	lastName?: string;
	email: string;
	createdAt?: string;
	[key: string]: unknown;
}

export interface CreateUserResponse {
	user: CreatedUserApi;
	username: string;
	temporaryPassword: string;
}

export async function createUser(body: CreateUserBody): Promise<CreateUserResponse> {
	return post<CreateUserResponse>("/api/users", {
		firstName: body.firstName,
		lastName: body.lastName,
		email: body.email,
		group: body.group,
		teams: body.teams,
		mustChangePassword: body.mustChangePassword,
	});
}

export interface UserGroupPopulated {
	_id?: string;
	name?: string;
	description?: string;
	userCount?: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface UserTeamPopulated {
	_id?: string;
	name?: string;
	description?: string;
	userCount?: number;
	groupTechnicalName?: string;
	createdAt?: string;
	updatedAt?: string;
}

/** Lean user document from GET /api/users (password excluded). */
export interface UserApiListItem {
	_id: string;
	firstName?: string;
	lastName?: string;
	email: string;
	username?: string;
	role?: string;
	profilePictureUrl?: string | null;
	createdAt: string;
	updatedAt?: string;
	group?: UserGroupPopulated | string | null;
	teams?: (UserTeamPopulated | string)[] | null;
}

function groupIdFromApi(group: UserApiListItem["group"]): string | undefined {
	if (!group) return undefined;
	if (typeof group === "string" && group.trim() !== "") return group;
	if (typeof group === "object" && group._id != null) return String(group._id);
	return undefined;
}

function teamIdsFromApi(teams: UserApiListItem["teams"]): string[] {
	if (!Array.isArray(teams)) return [];
	return teams
		.map((t) => {
			if (typeof t === "string" && t.trim() !== "") return t;
			if (t && typeof t === "object" && t._id != null) return String(t._id);
			return "";
		})
		.filter(Boolean);
}

export function mapUserListItem(u: UserApiListItem): SettingsUserListRow {
	const displayName =
		[u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
		(u.username ? String(u.username) : "") ||
		u.email;
	const group =
		u.group && typeof u.group === "object" && "name" in u.group && u.group.name != null
			? String(u.group.name)
			: "—";
	const teamsSummary = Array.isArray(u.teams)
		? u.teams
				.map((t) => (t && typeof t === "object" && t.name ? String(t.name) : ""))
				.filter(Boolean)
				.join(", ") || "—"
		: "—";
	return {
		id: u._id,
		displayName,
		firstName: u.firstName,
		lastName: u.lastName,
		username: u.username ?? "—",
		email: u.email,
		groupName: group,
		teamsSummary,
		groupId: groupIdFromApi(u.group),
		teamIds: teamIdsFromApi(u.teams),
		role: u.role ?? "—",
		profilePictureUrl: u.profilePictureUrl ?? null,
		createdAt: u.createdAt,
	};
}

/** POST /api/users/:id/avatar — multipart field name must be `avatar`. */
export async function uploadUserAvatar(id: string, file: File): Promise<AuthUser> {
	const formData = new FormData();
	formData.append("avatar", file);
	const res = await request<{ user: AuthUser }>("POST", `/api/users/${encodeURIComponent(id)}/avatar`, {
		body: formData,
	});
	return res.user;
}

/** DELETE /api/users/:id/avatar */
export async function deleteUserAvatar(id: string): Promise<AuthUser> {
	const res = await del<{ user: AuthUser }>(`/api/users/${encodeURIComponent(id)}/avatar`);
	return res.user;
}

export interface ListUsersParams extends BaseListQuery {
	firstName?: string;
	lastName?: string;
	email?: string;
	username?: string;
}

/** PATCH /api/users/:id — only include fields you want to change. */
export interface UpdateUserBody {
	firstName?: string;
	lastName?: string;
	email?: string;
	group?: string;
	teams?: string[];
	mustChangePassword?: boolean;
}

export async function getUserById(id: string): Promise<SettingsUserListRow> {
	const raw = await get<UserApiListItem>(`/api/users/${encodeURIComponent(id)}`);
	return mapUserListItem(raw);
}

export async function updateUser(id: string, body: UpdateUserBody): Promise<SettingsUserListRow> {
	const raw = await patch<UserApiListItem>(`/api/users/${encodeURIComponent(id)}`, body);
	return mapUserListItem(raw);
}

export async function deleteUser(id: string): Promise<void> {
	await del(`/api/users/${encodeURIComponent(id)}`);
}

export async function listUsers(params: ListUsersParams = {}): Promise<ListResponse<SettingsUserListRow>> {
	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(100, Math.max(1, params.limit ?? 10));
	const qs = buildQueryString({
		page,
		limit,
		sort: params.sort,
		q: params.q,
		search: params.search,
		firstName: params.firstName,
		lastName: params.lastName,
		email: params.email,
		username: params.username,
		createdAfter: params.createdAfter,
		createdBefore: params.createdBefore,
	});
	const raw = await get<ListResponse<UserApiListItem>>(`/api/users${qs}`);
	return {
		data: raw.data.map(mapUserListItem),
		pagination: raw.pagination,
	};
}

export async function bulkDeleteUsers(ids: string[]): Promise<BulkDeleteResult> {
	const unique = [...new Set(ids)];
	return post<BulkDeleteResult>("/api/users/bulk-delete", { ids: unique });
}
