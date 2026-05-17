import type { AuthUser } from "../api/services/auth";

export function userDisplayName(user: AuthUser): string {
	const first = user.firstName?.trim() ?? "";
	const last = user.lastName?.trim() ?? "";
	const full = [first, last].filter(Boolean).join(" ");
	if (full) return full;
	return user.username?.trim() || user.email?.trim() || "User";
}

export function userShortName(user: AuthUser): string {
	const first = user.firstName?.trim();
	if (first) return first;
	const fromUsername = user.username?.trim().split(/[\s@._-]/)[0];
	if (fromUsername) return fromUsername;
	return user.email?.trim().split("@")[0] || "User";
}

export type UserInitialsFields = {
	firstName?: string;
	lastName?: string;
	email?: string;
	username?: string;
};

export function userInitialsFromFields(fields: UserInitialsFields): string {
	const first = fields.firstName?.trim()?.[0] ?? "";
	const last = fields.lastName?.trim()?.[0] ?? "";
	if (first || last) return `${first}${last}`.toUpperCase();
	const email = fields.email?.trim();
	if (email) return email[0]!.toUpperCase();
	const username = fields.username?.trim();
	if (username && username !== "—") return username[0]!.toUpperCase();
	return "?";
}

export function userInitials(user: AuthUser): string {
	return userInitialsFromFields({
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		username: user.username,
	});
}

/** Populated user refs from list/dashboard/team APIs (not necessarily `AuthUser`). */
export type ApiUserRef = UserInitialsFields & {
	_id?: string;
	profilePictureUrl?: string | null;
};

export function apiUserDisplayName(user: ApiUserRef | null | undefined): string {
	if (!user) return "—";
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return fullName || user.username?.trim() || user.email?.trim() || "—";
}

/** Returns `profilePictureUrl` only when the API provides one; otherwise use initials in the UI. */
export function apiUserProfilePictureUrl(user: ApiUserRef | null | undefined): string | null {
	const url = user?.profilePictureUrl?.trim();
	return url || null;
}
