import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteGroups, createGroup, deleteGroup, listGroups, updateGroup } from "../services/groups";
import { queryKeys } from "../queryKeys";

const GROUPS_PAGE_SIZE = 30;

export function useGroupsInfiniteList(options: { q: string; sort: string }) {
	return useInfiniteQuery({
		queryKey: [...queryKeys.groups.all, "list", { q: options.q, sort: options.sort, limit: GROUPS_PAGE_SIZE }] as const,
		queryFn: ({ pageParam }) =>
			listGroups({
				page: pageParam,
				limit: GROUPS_PAGE_SIZE,
				sort: options.sort,
				...(options.q.trim() ? { q: options.q.trim() } : {}),
			}),
		initialPageParam: 1,
		getNextPageParam: (last) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined),
	});
}

export function useCreateGroupMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createGroup,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
		},
	});
}

export function useUpdateGroupMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string; name: string; description?: string }) => updateGroup(id, body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
		},
	});
}

export function useDeleteGroupMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteGroup,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
		},
	});
}

export function useBulkDeleteGroupsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: bulkDeleteGroups,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
		},
	});
}
