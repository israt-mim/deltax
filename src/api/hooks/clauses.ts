import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getClauseById, listClauses, type ClausesListParams } from "../services/clauses";
import { queryKeys } from "../queryKeys";

const CLAUSES_PAGE_SIZE = 20;

export type ClausesListFilters = Pick<
	ClausesListParams,
	| "search"
	| "q"
	| "displayId"
	| "category"
	| "subcategory"
	| "documentType"
	| "isActive"
	| "tag"
	| "tags"
	| "createdAfter"
	| "createdBefore"
> & {
	sort?: string;
	limit?: number;
};

/** Total clause count from list pagination (`limit: 1`). */
export function useClausesTotalCount(options: { sort?: string } = {}) {
	const sort = options.sort ?? "-createdAt";
	return useQuery({
		queryKey: [...queryKeys.clauses.all, "total-count", { sort }] as const,
		queryFn: async () => {
			const res = await listClauses({ page: 1, limit: 1, sort });
			return res.pagination.total;
		},
		staleTime: 30_000,
	});
}

/** Paginated GET /api/clauses for the clauses table. */
export function useClausesInfiniteList(options: ClausesListFilters = {}) {
	const sort = options.sort ?? "-createdAt";
	const limit = Math.min(options.limit ?? CLAUSES_PAGE_SIZE, 100);
	const search = (options.search ?? options.q ?? "").trim();
	const filters = {
		displayId: options.displayId?.trim(),
		category: options.category?.trim(),
		subcategory: options.subcategory?.trim(),
		documentType: options.documentType?.trim(),
		isActive: options.isActive,
		tag: options.tag?.trim(),
		tags: options.tags?.trim(),
		createdAfter: options.createdAfter?.trim(),
		createdBefore: options.createdBefore?.trim(),
	};

	return useInfiniteQuery({
		queryKey: [...queryKeys.clauses.all, "list", { sort, limit, search, ...filters }] as const,
		queryFn: ({ pageParam }) =>
			listClauses({
				page: pageParam,
				limit,
				sort,
				...(search ? { search } : {}),
				...filters,
			}),
		initialPageParam: 1,
		getNextPageParam: (last) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined),
	});
}

export function useClauseDetailQuery(options: { id: string | undefined }) {
	const id = options.id?.trim() ?? "";
	return useQuery({
		queryKey: [...queryKeys.clauses.all, "detail", id] as const,
		queryFn: () => getClauseById(id),
		enabled: Boolean(id),
	});
}
