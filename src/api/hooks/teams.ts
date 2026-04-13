import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteTeams, createTeam, deleteTeam, listTeams, updateTeam } from "../services/teams";
import { queryKeys } from "../queryKeys";

const TEAMS_PAGE_SIZE = 30;

export function useTeamsInfiniteList(options: { q: string; sort: string }) {
	return useInfiniteQuery({
		queryKey: [...queryKeys.teams.all, "list", { q: options.q, sort: options.sort, limit: TEAMS_PAGE_SIZE }] as const,
		queryFn: ({ pageParam }) =>
			listTeams({
				page: pageParam,
				limit: TEAMS_PAGE_SIZE,
				sort: options.sort,
				...(options.q.trim() ? { q: options.q.trim() } : {}),
			}),
		initialPageParam: 1,
		getNextPageParam: (last) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined),
	});
}

export function useCreateTeamMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createTeam,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
		},
	});
}

export function useUpdateTeamMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...body }: { id: string; name: string; description?: string }) => updateTeam(id, body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
		},
	});
}

export function useDeleteTeamMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteTeam,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
		},
	});
}

export function useBulkDeleteTeamsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: bulkDeleteTeams,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
		},
	});
}
