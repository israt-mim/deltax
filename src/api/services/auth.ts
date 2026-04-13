import { ApiError, get, post } from "../client/http";

/** Current user from `POST /api/auth/login` or `GET /api/auth/me` (no password). */
export interface AuthUser {
	_id: string;
	firstName?: string;
	lastName?: string;
	email: string;
	username: string;
	group?: unknown;
	teams?: unknown[];
	mustChangePassword?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export async function authLogin(body: { login: string; password: string }): Promise<AuthUser> {
	const res = await post<{ user: AuthUser }>("/api/auth/login", body);
	return res.user;
}

export async function authLogout(): Promise<void> {
	await post<{ message: string }>("/api/auth/logout");
}

/** Returns the session user, or `null` if not authenticated (401) or on recoverable errors. */
export async function fetchAuthMe(): Promise<AuthUser | null> {
	try {
		const res = await get<{ user: AuthUser }>("/api/auth/me");
		return res.user;
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return null;
		console.warn("[auth] GET /api/auth/me failed", e);
		return null;
	}
}
