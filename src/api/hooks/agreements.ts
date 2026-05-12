import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import {
	bulkDeleteAgreements,
	createAgreement,
	getAgreementDashboard,
	getAgreementTeams,
	listAgreements,
	patchAgreementClauses,
	patchAgreementFieldValues,
	patchAgreementLineItem,
	patchAgreementTeamMembers,
	postAgreementLineItem,
	type AgreementsListParams,
	type CreateAgreementBody,
	type PatchAgreementClausesBody,
	type PatchAgreementFieldValuesBody,
	type PatchAgreementLineItemBody,
	type PatchAgreementTeamMembersBody,
	type PostAgreementLineItemBody,
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

/** Lightweight agreement summary for header / dashboard views. */
export function useAgreementDashboardQuery(options: { agreementId: string | undefined; enabled?: boolean }) {
	const id = options.agreementId?.trim();
	return useQuery({
		queryKey: [...queryKeys.agreements.all, "dashboard", id] as const,
		queryFn: () => getAgreementDashboard(id as string),
		enabled: Boolean(id) && options.enabled !== false,
	});
}

/** Teams and members attached to one agreement. */
export function useAgreementTeamsQuery(options: { agreementId: string | undefined; enabled?: boolean }) {
	const id = options.agreementId?.trim();
	return useQuery({
		queryKey: [...queryKeys.agreements.all, "teams", id] as const,
		queryFn: () => getAgreementTeams(id as string),
		enabled: Boolean(id) && options.enabled !== false,
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

/** Discards one agreement document (`ids: [id]`). */
export function useDeleteAgreementMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (agreementId: string) => bulkDeleteAgreements([agreementId]),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
		},
	});
}

export function useBulkDeleteAgreementsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => bulkDeleteAgreements(ids),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
		},
	});
}

export function usePatchAgreementFieldValuesMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (args: { agreementId: string; body: PatchAgreementFieldValuesBody }) =>
			patchAgreementFieldValues(args.agreementId, args.body),
		onSettled: (_data, _err, args) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
			if (args?.agreementId) {
				void queryClient.invalidateQueries({
					queryKey: [...queryKeys.agreements.all, "detail", args.agreementId] as const,
				});
			}
		},
	});
}

export function usePatchAgreementClausesMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (args: { agreementId: string; body: PatchAgreementClausesBody }) =>
			patchAgreementClauses(args.agreementId, args.body),
		onSettled: (_data, _err, args) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
			if (args?.agreementId) {
				void queryClient.invalidateQueries({
					queryKey: [...queryKeys.agreements.all, "detail", args.agreementId] as const,
				});
			}
		},
	});
}

export function usePatchAgreementTeamMembersMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (args: {
			agreementId: string;
			teamId: string;
			body: PatchAgreementTeamMembersBody;
		}) => patchAgreementTeamMembers(args.agreementId, args.teamId, args.body),
		onSettled: (_data, _err, args) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
			if (args?.agreementId) {
				void queryClient.invalidateQueries({
					queryKey: [...queryKeys.agreements.all, "teams", args.agreementId] as const,
				});
			}
		},
	});
}

export function usePostAgreementLineItemMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (args: { agreementId: string; body?: PostAgreementLineItemBody }) =>
			postAgreementLineItem(args.agreementId, args.body),
		onSettled: (_data, _err, args) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
			if (args?.agreementId) {
				void queryClient.invalidateQueries({
					queryKey: [...queryKeys.agreements.all, "detail", args.agreementId] as const,
				});
			}
		},
	});
}

export function usePatchAgreementLineItemMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (args: { agreementId: string; lineItemId: string; body: PatchAgreementLineItemBody }) =>
			patchAgreementLineItem(args.agreementId, args.lineItemId, args.body),
		onSettled: (_data, _err, args) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreements.all });
			if (args?.agreementId) {
				void queryClient.invalidateQueries({
					queryKey: [...queryKeys.agreements.all, "detail", args.agreementId] as const,
				});
			}
		},
	});
}
