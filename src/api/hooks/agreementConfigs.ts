import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	configureAgreementConfig,
	createAgreementConfig,
	deleteAgreementConfig,
	getAgreementConfigById,
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
		},
	});
}

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
