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

export function userInitials(user: AuthUser): string {
	const first = user.firstName?.trim()?.[0] ?? "";
	const last = user.lastName?.trim()?.[0] ?? "";
	if (first || last) return `${first}${last}`.toUpperCase();
	const email = user.email?.trim();
	if (email) return email[0]!.toUpperCase();
	const username = user.username?.trim();
	if (username) return username[0]!.toUpperCase();
	return "?";
}
