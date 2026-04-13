export interface ListPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface ListResponse<T> {
	data: T[];
	pagination: ListPagination;
}

/** Shared list query params (GET teams / groups / users). */
export interface BaseListQuery {
	page?: number;
	limit?: number;
	sort?: string;
	/** Case-insensitive substring search (server escapes regex). */
	q?: string;
	search?: string;
	createdAfter?: string;
	createdBefore?: string;
}
