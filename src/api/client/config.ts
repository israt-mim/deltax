/** Base URL for API calls. No trailing slash. Empty = same origin (e.g. Vite dev proxy to `/api`). */
export function getApiBaseUrl(): string {
	const raw = import.meta.env.VITE_API_BASE_URL;
	if (raw === undefined || raw === "") return "";
	return String(raw).replace(/\/$/, "");
}

export function buildApiUrl(path: string): string {
	const base = getApiBaseUrl();
	const p = path.startsWith("/") ? path : `/${path}`;
	if (!base) return p;
	return `${base}${p}`;
}
