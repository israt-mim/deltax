import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { createAgreement, type CreateAgreementBody } from "../services/agreements";

export function useCreateAgreementMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateAgreementBody) => createAgreement(body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.agreementConfigs.all });
		},
	});
}
