import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	bulkDeleteUsers,
	createUser,
	deleteUser,
	listUsers,
	updateUser,
	type UpdateUserBody,
} from "../services/users";
import { queryKeys } from "../queryKeys";

const USERS_PAGE_SIZE = 30;

export function useUsersInfiniteList(options: { q: string; sort: string }) {
	return useInfiniteQuery({
		queryKey: [...queryKeys.users.all, "list", { q: options.q, sort: options.sort, limit: USERS_PAGE_SIZE }] as const,
		queryFn: ({ pageParam }) =>
			listUsers({
				page: pageParam,
				limit: USERS_PAGE_SIZE,
				sort: options.sort,
				...(options.q.trim() ? { q: options.q.trim() } : {}),
			}),
		initialPageParam: 1,
		getNextPageParam: (last) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined),
	});
}

export function useCreateUserMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createUser,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
		},
	});
}

export function useBulkDeleteUsersMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: bulkDeleteUsers,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
		},
	});
}

export function useUpdateUserMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & UpdateUserBody) => updateUser(id, body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
		},
	});
}

export function useDeleteUserMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteUser,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
		},
	});
}
