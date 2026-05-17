import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { ApiError } from "../client/http";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { isMongoObjectIdString } from "../services/agreementCatalog";
import {
	agreementStepDetailsOfQuery,
	bulkDeleteAgreements,
	createAgreement,
	getAgreementDashboard,
	getAgreementStepDetails,
	getAgreementSteps,
	getAgreementTeams,
	isAuthoringOrModificationAgreementCreationStep,
	listAgreements,
	patchAgreementClauses,
	patchAgreementFieldValues,
	patchAgreementLineItem,
	patchAgreementTeamMembers,
	postAgreementLineItem,
	type AgreementDocumentStep,
	type AgreementsListParams,
	type CreateAgreementBody,
	type PatchAgreementClausesBody,
	type PatchAgreementFieldValuesBody,
	type PatchAgreementLineItemBody,
	type PatchAgreementTeamMembersBody,
	type PostAgreementLineItemBody,
} from "../services/agreements";

export function normalizeAgreementLineItemIdForQuery(
	lineItemQuery: string | null | undefined
): string | undefined {
	const q = lineItemQuery?.trim();
	if (!q || q.toLowerCase() === "list") return undefined;
	return q;
}

export function agreementStepDetailsQueryKey(
	agreementId: string,
	of: string,
	lineItemId?: string
) {
	return [
		...queryKeys.agreements.all,
		"step-details",
		agreementId.trim(),
		of.trim(),
		lineItemId?.trim() || "list",
	] as const;
}

export function formatAgreementStepDetailsQueryError(error: unknown): string | null {
	if (!error) return null;
	if (error instanceof ApiError && error.status === 404) {
		return error.message.trim() || "No layout found for this step.";
	}
	return formatUserFacingError(error, "Could not load fields for this step.");
}

export function invalidateAgreementStepDetailsQueries(
	queryClient: QueryClient,
	agreementId: string
) {
	void queryClient.invalidateQueries({
		queryKey: [...queryKeys.agreements.all, "step-details", agreementId.trim()],
	});
}

const AGREEMENTS_LIST_PAGE_SIZE = 20;

/** Total agreement count from list pagination (`limit: 1`). */
export function useAgreementsTotalCount(options: { sort?: string } = {}) {
	const sort = options.sort ?? "-createdAt";
	return useQuery({
		queryKey: [...queryKeys.agreements.all, "total-count", { sort }] as const,
		queryFn: async () => {
			const res = await listAgreements({ page: 1, limit: 1, sort });
			return res.pagination.total;
		},
		staleTime: 30_000,
	});
}

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

/** Wizard/document steps for one agreement (`GET /api/agreements/:id/steps`). */
export function useAgreementDocumentStepsQuery(options: {
	agreementId: string;
	enabled?: boolean;
	/** When true (default), hides Authoring / Modification catalog steps. */
	hideAuthoringSteps?: boolean;
}) {
	const id = options.agreementId.trim();
	const hideAuthoring = options.hideAuthoringSteps !== false;
	const canFetch = Boolean(id) && isMongoObjectIdString(id) && options.enabled !== false;

	return useQuery({
		queryKey: [...queryKeys.agreements.all, "steps", id, { hideAuthoring }] as const,
		queryFn: async () => {
			const res = await getAgreementSteps(id);
			const raw = Array.isArray(res.steps) ? res.steps : [];
			return hideAuthoring
				? raw.filter((s) => !isAuthoringOrModificationAgreementCreationStep(s))
				: raw;
		},
		enabled: canFetch,
	});
}

/** Step layout + values for one agreement tab (`GET /api/agreements/:id/details?of=…`). */
export function useAgreementStepDetailsQuery(options: {
	agreementId: string;
	step: AgreementDocumentStep | null | undefined;
	lineItemId?: string | null;
	enabled?: boolean;
}) {
	const agreementId = options.agreementId.trim();
	const step = options.step;
	const of = step ? agreementStepDetailsOfQuery(step) : "";
	const lineItemId = normalizeAgreementLineItemIdForQuery(options.lineItemId);
	const canFetch =
		Boolean(agreementId) &&
		isMongoObjectIdString(agreementId) &&
		Boolean(step) &&
		Boolean(of) &&
		options.enabled !== false;

	return useQuery({
		queryKey: agreementStepDetailsQueryKey(agreementId, of, lineItemId),
		queryFn: () => getAgreementStepDetails(agreementId, of, { lineItemId }),
		enabled: canFetch,
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
				invalidateAgreementStepDetailsQueries(queryClient, args.agreementId);
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
				invalidateAgreementStepDetailsQueries(queryClient, args.agreementId);
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
				invalidateAgreementStepDetailsQueries(queryClient, args.agreementId);
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
				invalidateAgreementStepDetailsQueries(queryClient, args.agreementId);
			}
		},
	});
}
