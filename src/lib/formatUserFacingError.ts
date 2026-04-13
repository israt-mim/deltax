/** Heuristic: backend leaked driver / DB internals into `message`. */
function looksLikeTechnicalDump(message: string): boolean {
	return (
		/E11000|MongoServerError|duplicate key error|dup key:|collection:\s*\w|\.users\.|\.groups\.|\.teams\./i.test(
			message
		) || /index:\s*\w+_\d+/i.test(message)
	);
}

/**
 * Turns API / Mongo raw `message` strings into short copy for toasts.
 * Unknown errors fall back to `fallback`.
 */
export function formatUserFacingError(error: unknown, fallback: string): string {
	const raw =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: fallback;

	const m = raw.trim();
	if (!m) return fallback;

	// MongoDB duplicate key — match before generic "technical" branch.
	if (/E11000|duplicate key error/i.test(m)) {
		if (/dup key:\s*\{[^}]*\bemail\b/i.test(m) || /\bemail_\d+\b/i.test(m)) {
			return "This email is already in use. Please use a different one.";
		}
		if (/dup key:\s*\{[^}]*\busername\b/i.test(m) || /\busername_\d+\b/i.test(m)) {
			return "This username is already taken. Please choose another.";
		}
		if (/dup key:\s*\{[^}]*\bname\b/i.test(m) || /\bname_\d+\b/i.test(m)) {
			return "This name is already taken. Please choose a different one.";
		}
		return "That record already exists. Please change the details and try again.";
	}

	if (looksLikeTechnicalDump(m)) {
		return fallback;
	}

	return m.length > 220 ? fallback : m;
}
