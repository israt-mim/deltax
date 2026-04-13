import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000,
				retry: 1,
			},
			mutations: {
				retry: 0,
			},
		},
	});
}
