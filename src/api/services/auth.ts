import { ApiError, get, post } from "../client/http";

/** Current user from `POST /api/auth/login` or `GET /api/auth/user` (no password). */
export interface AuthUser {
	_id: string;
	firstName?: string;
	lastName?: string;
	email: string;
	username: string;
	/** Full URL to the avatar image, or null when none is set. */
	profilePictureUrl?: string | null;
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

/**
 * Sets a new password for the **current session user**.
 * The backend identifies the user from the authenticated session (e.g. cookie / session id sent
 * automatically because `fetch` uses `credentials: "include"`); no user id is required in the body.
 */
export interface AuthChangePasswordBody {
	newPassword: string;
	confirmNewPassword: string;
	/** Client sends `false` so the server can persist the flag when updating the user. */
	mustChangePassword: false;
}

export async function authChangePassword(body: AuthChangePasswordBody): Promise<AuthUser> {
	const res = await post<{ user: AuthUser }>("/api/auth/change-password", body);
	return res.user;
}

export async function authForgotPassword(body: { email: string }): Promise<void> {
	await post<{ message: string }>("/api/auth/forgot-password", body);
}

export async function authValidateResetToken(token: string): Promise<void> {
	await get<{ valid: true }>(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
}

export async function authResetPassword(body: {
	token: string;
	newPassword: string;
}): Promise<void> {
	await post<{ message: string }>("/api/auth/reset-password", body);
}

export async function authLogout(): Promise<void> {
	await post<{ message: string }>("/api/auth/logout");
}

/** Returns the session user, or `null` if not authenticated (401) or on recoverable errors. */
export async function fetchAuthUser(): Promise<AuthUser | null> {
	try {
		const res = await get<{ user: AuthUser }>("/api/auth/user");
		return res.user;
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return null;
		console.warn("[auth] GET /api/auth/user failed", e);
		return null;
	}
}
