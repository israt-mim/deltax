/** US-style: MM/DD/YYYY h:mm AM/PM */
export function formatUsDateTime(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString("en-US", {
		month: "2-digit",
		day: "2-digit",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}
