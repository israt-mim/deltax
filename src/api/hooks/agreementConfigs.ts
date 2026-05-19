import {
	type QueryClient,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	bulkDeleteAgreementConfigs,
	configureAgreementConfig,
	createAgreementConfig,
	deleteAgreementConfig,
	getAgreementConfigById,
	listAgreementConfigs,
	patchAgreementConfigActivation,
	patchAgreementConfigCatalog,
	type AgreementCatalogUpdateBody,
	type AgreementConfigsListParams,
	type AgreementConfigureRequestBody,
	type CreateAgreementConfigBody,
} from "../services/agreementConfigs";
import { queryKeys } from "../queryKeys";

export function useCreateAgreementConfigMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateAgreementConfigBody) => createAgreementConfig(body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreementConfigs.all });
			void queryClient.invalidateQueries({ queryKey: [...queryKeys.fields.all, "context-options"] });
		},
	});
}

const AGREEMENT_CONFIGS_LIST_PAGE_SIZE = 20;

/** Total agreement config count from list pagination (`limit: 1`). */
export function useAgreementConfigsTotalCount(options: { sort?: string } = {}) {
	const sort = options.sort ?? "-createdAt";
	return useQuery({
		queryKey: [...queryKeys.agreementConfigs.all, "total-count", { sort }] as const,
		queryFn: async () => {
			const res = await listAgreementConfigs({ page: 1, limit: 1, sort });
			return res.pagination.total;
		},
		staleTime: 30_000,
	});
}

export type AgreementConfigsListFilters = Pick<
	AgreementConfigsListParams,
	| "search"
	| "q"
	| "displayId"
	| "agreement_category"
	| "agreement_domain"
	| "agreement_type"
	| "agreement_subtype"
	| "isActive"
	| "isCompleted"
	| "createdAfter"
	| "createdBefore"
> & {
	sort?: string;
	limit?: number;
};

/** Paginated GET /api/agreement-configs for the configure agreements table. */
export function useAgreementConfigsInfiniteList(
	options: AgreementConfigsListFilters & { enabled?: boolean } = {}
) {
	const enabled = options.enabled !== false;
	const sort = options.sort ?? "-createdAt";
	const limit = Math.min(options.limit ?? AGREEMENT_CONFIGS_LIST_PAGE_SIZE, 100);
	const search = (options.search ?? options.q ?? "").trim();
	const displayId = options.displayId?.trim();
	const filters = {
		displayId: displayId || undefined,
		agreement_category: options.agreement_category?.trim(),
		agreement_domain: options.agreement_domain?.trim(),
		agreement_type: options.agreement_type?.trim(),
		agreement_subtype: options.agreement_subtype?.trim(),
		isActive: options.isActive,
		isCompleted: options.isCompleted,
		createdAfter: options.createdAfter?.trim(),
		createdBefore: options.createdBefore?.trim(),
	};

	return useInfiniteQuery({
		queryKey: [...queryKeys.agreementConfigs.all, "list", { sort, limit, search, ...filters }] as const,
		queryFn: ({ pageParam }) =>
			listAgreementConfigs({
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

/** `GET /api/agreement-configs/:id` — detail + wizard; single JSON object. */
export function useAgreementConfigQuery(options: { id: string | undefined }) {
	const id = options.id?.trim();
	return useQuery({
		queryKey: [...queryKeys.agreementConfigs.all, "detail", id] as const,
		queryFn: () => getAgreementConfigById(id as string),
		enabled: Boolean(id),
	});
}

export function useConfigureAgreementConfigMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: AgreementConfigureRequestBody }) =>
			configureAgreementConfig(id, body),
		onSuccess: (data, variables) => {
			queryClient.setQueryData([...queryKeys.agreementConfigs.all, "detail", variables.id], data);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreementConfigs.all });
		},
	});
}

export function usePatchAgreementConfigCatalogMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: AgreementCatalogUpdateBody }) => patchAgreementConfigCatalog(id, body),
		onSuccess: (data, variables) => {
			queryClient.setQueryData([...queryKeys.agreementConfigs.all, "detail", variables.id], data);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreementConfigs.all });
		},
	});
}

export function usePatchAgreementConfigActivationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
			patchAgreementConfigActivation(id, { isActive }),
		onSuccess: (data, variables) => {
			queryClient.setQueryData([...queryKeys.agreementConfigs.all, "detail", variables.id], data);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreementConfigs.all });
		},
	});
}

function invalidateAgreementConfigQueriesExceptDetail(queryClient: QueryClient) {
	const root = queryKeys.agreementConfigs.all[0];
	void queryClient.invalidateQueries({
		predicate: (query) => {
			const k = query.queryKey;
			if (k[0] !== root) return false;
			// Avoid invalidating detail queries: after delete the wizard can still be mounted
			// briefly; invalidating `["agreement-configs"]` would refetch active `.../detail/:id` → 404.
			if (k[1] === "detail") return false;
			return true;
		},
	});
}

export function useDeleteAgreementConfigMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteAgreementConfig(id),
		onSettled: (_data, _error, id) => {
			const detailKey = [...queryKeys.agreementConfigs.all, "detail", id] as const;
			void queryClient.cancelQueries({ queryKey: detailKey });
			queryClient.removeQueries({ queryKey: detailKey });
			invalidateAgreementConfigQueriesExceptDetail(queryClient);
		},
	});
}

export function useBulkDeleteAgreementConfigsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) => bulkDeleteAgreementConfigs(ids),
		onSuccess: (_data, ids) => {
			// Drop detail cache for requested ids (harmless for ids that still exist; refetch on next open).
			for (const id of ids) {
				const detailKey = [...queryKeys.agreementConfigs.all, "detail", id] as const;
				void queryClient.cancelQueries({ queryKey: detailKey });
				queryClient.removeQueries({ queryKey: detailKey });
			}
			invalidateAgreementConfigQueriesExceptDetail(queryClient);
		},
	});
}
