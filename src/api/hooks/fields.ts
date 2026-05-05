import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	bulkDeleteFields,
	createField,
	deleteField,
	fieldDocToRow,
	listFields,
	updateField,
	type CreateFieldBody,
	type UpdateFieldBody,
} from "../services/fields";
import { queryKeys } from "../queryKeys";

const FIELDS_PAGE_SIZE = 30;

/** Total field count from list pagination (lightweight `limit: 1` request). */
export function useFieldsTotalCount(options: { sort?: string } = {}) {
	const sort = options.sort ?? "-createdAt";
	return useQuery({
		queryKey: [...queryKeys.fields.all, "total-count", { sort }] as const,
		queryFn: async () => {
			const res = await listFields({ page: 1, limit: 1, sort });
			return res.pagination.total;
		},
		staleTime: 30_000,
	});
}

export function useFieldsInfiniteList(options: { q: string; sort: string; enabled?: boolean }) {
	const enabled = options.enabled !== false;
	return useInfiniteQuery({
		queryKey: [...queryKeys.fields.all, "list", { q: options.q, sort: options.sort, limit: FIELDS_PAGE_SIZE }] as const,
		queryFn: ({ pageParam }) =>
			listFields({
				page: pageParam,
				limit: FIELDS_PAGE_SIZE,
				sort: options.sort,
				...(options.q.trim() ? { q: options.q.trim() } : {}),
			}).then((res) => ({
				...res,
				data: res.data.map(fieldDocToRow),
			})),
		initialPageParam: 1,
		getNextPageParam: (last) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined),
		enabled,
	});
}

export function useCreateFieldMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateFieldBody) => createField(body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all });
		},
	});
}

export function useUpdateFieldMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateFieldBody }) => updateField(id, body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all });
		},
	});
}

export function useDeleteFieldMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteField,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all });
		},
	});
}

export function useBulkDeleteFieldsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: bulkDeleteFields,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all });
		},
	});
}

export type { CreateFieldBody, UpdateFieldBody };
