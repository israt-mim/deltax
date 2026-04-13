export interface BulkDeleteSkippedItem {
	id: string;
	message: string;
}

/** 200 response from POST .../bulk-delete */
export interface BulkDeleteResult {
	deleted: string[];
	skipped: BulkDeleteSkippedItem[];
	/** Present when `deleted` is empty; human-readable summary from the API. */
	info?: string;
}
