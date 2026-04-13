import { toast } from "react-toastify";
import type { BulkDeleteResult } from "../api/types/bulkDelete";

/** Success-line when at least one row was deleted (may include skipped details). */
export function bulkDeleteSummaryMessage(
	result: BulkDeleteResult,
	singular: string,
	plural: string
): string {
	const { deleted, skipped } = result;
	const d = deleted.length;
	const s = skipped.length;
	if (d === 0) return "";
	if (s === 0) {
		return `${d} ${d === 1 ? singular : plural} deleted.`;
	}
	const sample = skipped
		.slice(0, 3)
		.map((x) => x.message)
		.join("; ");
	const tail = s > 3 ? ` (+${s - 3} more)` : "";
	return `${d} deleted. ${s} not removed: ${sample}${tail}`;
}

/**
 * After a bulk-delete response: **info** toast when nothing was removed (uses API `info` when present),
 * otherwise **success** with a short summary.
 */
export function toastBulkDeleteResult(
	result: BulkDeleteResult,
	singular: string,
	plural: string,
	emptyFallback: string
): void {
	if (result.deleted.length === 0) {
		const msg = result.info?.trim() || emptyFallback;
		toast.info(msg);
		return;
	}
	toast.success(bulkDeleteSummaryMessage(result, singular, plural));
}
