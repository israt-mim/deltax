import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import {
	createAgreement,
	listAgreements,
	type AgreementsListParams,
	type CreateAgreementBody,
} from "../services/agreements";

const AGREEMENTS_LIST_PAGE_SIZE = 20;

export type AgreementsListFilters = Pick<
	AgreementsListParams,
	| "search"
	| "q"
	| "displayId"
	| "agreement_display_name"
	| "status"
	| "agreement_category"
	| "agreement_domain"
	| "agreement_type"
	| "agreement_subtype"
	| "createdAfter"
	| "createdBefore"
> & {
	sort?: string;
	limit?: number;
};

/** Paginated GET /api/agreements for the Agreements list page. */
export function useAgreementsInfiniteList(options: AgreementsListFilters & { enabled?: boolean } = {}) {
	const enabled = options.enabled !== false;
	const sort = options.sort ?? "-createdAt";
	const limit = Math.min(options.limit ?? AGREEMENTS_LIST_PAGE_SIZE, 100);
	const search = (options.search ?? options.q ?? "").trim();

	const filters = {
		displayId: options.displayId?.trim() || undefined,
		agreement_display_name: options.agreement_display_name?.trim() || undefined,
		status: options.status,
		agreement_category: options.agreement_category?.trim() || undefined,
		agreement_domain: options.agreement_domain?.trim() || undefined,
		agreement_type: options.agreement_type?.trim() || undefined,
		agreement_subtype: options.agreement_subtype?.trim() || undefined,
		createdAfter: options.createdAfter?.trim() || undefined,
		createdBefore: options.createdBefore?.trim() || undefined,
	};

	return useInfiniteQuery({
		queryKey: [...queryKeys.agreements.all, "list", { sort, limit, search, ...filters }] as const,
		queryFn: ({ pageParam }) =>
			listAgreements({
				page: pageParam,
				limit,
				sort,
				...(search ? { search } : {}),
				...filters,
			}),
		initialPageParam: 1,
		getNextPageParam: (last) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined),
		enabled,
	});
}

export function useCreateAgreementMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateAgreementBody) => createAgreement(body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreementConfigs.all });
		},
	});
}
