/** Build `?a=1&b=two` from plain values; omits undefined, null, and empty string. */
export function buildQueryString(params: Record<string, string | number | undefined | null>): string {
	const usp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null) continue;
		const s = String(value).trim();
		if (s === "") continue;
		usp.set(key, s);
	}
	const q = usp.toString();
	return q ? `?${q}` : "";
}
