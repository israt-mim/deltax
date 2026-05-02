import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createAgreementConfig,
	getAgreementConfigById,
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
