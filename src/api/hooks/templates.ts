import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createTemplate,
	deleteTemplate,
	getTemplateById,
	listTemplates,
	templateDocToRow,
	updateTemplate,
	type CreateTemplateBody,
	type ListTemplatesParams,
	type UpdateTemplateBody,
} from "../services/templates";
import { queryKeys } from "../queryKeys";

const TEMPLATES_PAGE_SIZE = 20;

export type TemplatesListFilters = Pick<ListTemplatesParams, "category" | "domain" | "type" | "subtype" | "agreement"> & {
	sort?: string;
	q?: string;
	enabled?: boolean;
};

export function useTemplatesTotalCount(options: { sort?: string } = {}) {
	const sort = options.sort ?? "-createdAt";
	return useQuery({
		queryKey: [...queryKeys.templates.all, "total-count", { sort }] as const,
		queryFn: async () => {
			const res = await listTemplates({ page: 1, limit: 1, sort });
			return res.pagination.total;
		},
		staleTime: 30_000,
	});
}

export function useTemplatesInfiniteList(options: TemplatesListFilters = {}) {
	const enabled = options.enabled !== false;
	const sort = options.sort ?? "-createdAt";
	const q = options.q?.trim() ?? "";
	const filters = {
		category: options.category,
		domain: options.domain,
		type: options.type,
		subtype: options.subtype,
		agreement: options.agreement,
	};

	return useInfiniteQuery({
		queryKey: [
			...queryKeys.templates.all,
			"list",
			{ sort, limit: TEMPLATES_PAGE_SIZE, q, ...filters },
		] as const,
		queryFn: ({ pageParam }) =>
			listTemplates({
				page: pageParam,
				limit: TEMPLATES_PAGE_SIZE,
				sort,
				...filters,
			}).then((res) => ({
				...res,
				data: res.data.map(templateDocToRow),
			})),
		initialPageParam: 1,
		getNextPageParam: (last) => (last.pagination.hasNextPage ? last.pagination.page + 1 : undefined),
		enabled,
	});
}

export function useTemplateDetailQuery(options: { id: string | undefined }) {
	const id = options.id?.trim() ?? "";
	return useQuery({
		queryKey: [...queryKeys.templates.all, "detail", id] as const,
		queryFn: () => getTemplateById(id),
		enabled: Boolean(id),
	});
}

export function useCreateTemplateMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateTemplateBody) => createTemplate(body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
		},
	});
}

export function useUpdateTemplateMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateTemplateBody }) => updateTemplate(id, body),
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
		},
	});
}

export function useDeleteTemplateMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteTemplate,
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
		},
	});
}

export type { CreateTemplateBody, UpdateTemplateBody };
