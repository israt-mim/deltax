import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	bulkDeleteUsers,
	createUser,
	deleteUser,
	deleteUserAvatar,
	getUserById,
	listUsers,
	updateUser,
	uploadUserAvatar,
	type UpdateUserBody,
} from "../services/users";
import { queryKeys } from "../queryKeys";
export type UpdateProfileBody = Pick<UpdateUserBody, "firstName" | "lastName" | "email">;

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

/** Full user record for the signed-in user (group / teams labels). */
export function useCurrentUserQuery(userId: string | undefined) {
	const id = userId?.trim() ?? "";
	return useQuery({
		queryKey: [...queryKeys.users.all, "detail", id] as const,
		queryFn: () => getUserById(id),
		enabled: Boolean(id),
		staleTime: 60_000,
	});
}

export function useUpdateProfileMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string } & UpdateProfileBody) => updateUser(id, body),
		onSuccess: (data, variables) => {
			queryClient.setQueryData([...queryKeys.users.all, "detail", variables.id] as const, data);
		},
		onSettled: (_data, _err, variables) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
			if (variables?.id) {
				void queryClient.invalidateQueries({ queryKey: [...queryKeys.users.all, "detail", variables.id] });
			}
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

export function useUploadUserAvatarMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, file }: { id: string; file: File }) => uploadUserAvatar(id, file),
		onSettled: (_data, _err, variables) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
			if (variables?.id) {
				void queryClient.invalidateQueries({ queryKey: [...queryKeys.users.all, "detail", variables.id] });
			}
		},
	});
}

export function useDeleteUserAvatarMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteUserAvatar(id),
		onSettled: (_data, _err, id) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
			if (id) {
				void queryClient.invalidateQueries({ queryKey: [...queryKeys.users.all, "detail", id] });
			}
		},
	});
}
