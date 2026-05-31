import { useCallback, useMemo, useState } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { toast } from "react-toastify";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { Button } from "../components/base/Button";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { FloatingBar } from "../components/base/FloatingBar";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { useColumns, type ColumnConfig } from "../hooks/useColumns";
import type { FieldRow } from "../schemas/fieldConfiguration";
import { Card } from "../components/base/Card";
import { useNavigate } from "react-router-dom";
import {
	useBulkDeleteFieldsMutation,
	useDeleteFieldMutation,
	useFieldsInfiniteList,
} from "../api/hooks/fields";
import { toastBulkDeleteResult } from "../lib/bulkDeleteFeedback";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";
import { SearchInput } from "../components/form-input/SearchInput";
import { createStickyActionsColumn } from "../components/modules/settings/stickyActionsColumn";

const fieldColumnConfigs: ColumnConfig<FieldRow>[] = [
	{
		key: "name",
		name: "Name",
		width: 180,
		minWidth: 120,
		sortable: true,
	},
	{
		key: "group",
		name: "Group",
		width: 200,
		minWidth: 120,
		sortable: true,
	},
	{
		key: "groupTechnicalName",
		name: "Group Technical Name",
		width: 210,
		minWidth: 140,
		sortable: true,
	},
	{
		key: "context",
		name: "Context",
		width: 240,
		minWidth: 140,
		sortable: true,
	},
	{
		key: "type",
		name: "Type",
		width: 120,
		minWidth: 80,
		sortable: true,
	},
	{
		key: "dataType",
		name: "Data Type",
		width: 120,
		minWidth: 80,
		maxWidth: 160,
	},
	{
		key: "tags",
		name: "Tags",
		width: 160,
		minWidth: 120,
		sortable: true,
		isSticky: true,
		cell: ({ getValue }) => {
			const tags = getValue() as string[];
			if (!tags?.length) return null;
			return (
				<div className="flex gap-1">
					{tags.map((tag) => (
						<span
							key={tag}
							className="px-2 py-0.5 text-xs font-medium rounded bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300"
						>
							{tag}
						</span>
					))}
				</div>
			);
		},
	},
];

function FieldRowMenu({ field, onDeleteRequest }: { field: FieldRow; onDeleteRequest: (row: FieldRow) => void }) {
	const items: MenuProps["items"] = [
		{
			key: "delete",
			icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
			label: "Delete",
			danger: true,
		},
	];

	return (
		<div
			className="flex items-center justify-center"
			data-row-click-ignore
			onClick={(e) => e.stopPropagation()}
		>
			<Dropdown
				trigger={["click"]}
				classNames={{ root: "actions-dropdown-icon" }}
				menu={{
					items,
					onClick: ({ key, domEvent }) => {
						domEvent.preventDefault();
						domEvent.stopPropagation();
						if (key === "delete") onDeleteRequest(field);
					},
				}}
			>
				<button
					type="button"
					aria-label="Field actions"
					className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
				>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</button>
			</Dropdown>
		</div>
	);
}

export const FieldConfiguration = () => {
	usePageBreadcrumb([
		crumb("Configure", "/configure"),
		crumb("Fields", "/configure/fields"),
	]);

	const navigate = useNavigate();
	const columns = useColumns(fieldColumnConfigs);
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebouncedValue(searchInput, 500);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [fieldPendingDelete, setFieldPendingDelete] = useState<FieldRow | null>(null);

	const listQuery = useFieldsInfiniteList({ q: debouncedSearch, sort: "-createdAt" });
	const bulkDeleteMutation = useBulkDeleteFieldsMutation();
	const deleteFieldMutation = useDeleteFieldMutation();

	const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const clearSelection = useCallback(() => {
		setCheckedIds(new Set());
	}, []);

	const requestDeleteField = useCallback((field: FieldRow) => {
		setFieldPendingDelete(field);
	}, []);
	const confirmDeleteField = useCallback(async () => {
		if (!fieldPendingDelete) return;
		try {
			await deleteFieldMutation.mutateAsync(fieldPendingDelete.id);
			toast.success("Field deleted.");
			setCheckedIds((prev) => {
				const next = new Set(prev);
				next.delete(fieldPendingDelete.id);
				return next;
			});
			setFieldPendingDelete(null);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete field."));
		}
	}, [deleteFieldMutation, fieldPendingDelete]);

	const handleBulkDelete = useCallback(async () => {
		const ids = [...checkedIds];
		if (!ids.length) return;
		try {
			const result = await bulkDeleteMutation.mutateAsync(ids);
			toastBulkDeleteResult(result, "field", "fields", "No fields were deleted.");
			clearSelection();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete fields."));
		}
	}, [bulkDeleteMutation, checkedIds, clearSelection]);

	const isInitialLoading = listQuery.isLoading && !listQuery.data;
	const isLoadingMore = listQuery.isFetchingNextPage;
	const hasMore = Boolean(listQuery.hasNextPage);
	const actionsColumn = useMemo(
		() => createStickyActionsColumn<FieldRow>(
			({ row }) => <FieldRowMenu field={row.original} onDeleteRequest={requestDeleteField} />
		),
		[requestDeleteField]
	);

	return (
		<CardMain className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<Title>Fields</Title>
				<Button size="md" onClick={() => navigate("/configure/fields/create")}>
					<AddOutlinedIcon sx={{ fontSize: 14 }} />
					New
				</Button>
			</div>

			{listQuery.isError && (
				<p className="text-sm text-error-500">
					{formatUserFacingError(listQuery.error, "Could not load fields.")}{" "}
					<button
						type="button"
						className="font-medium text-primary-600 underline dark:text-primary-400"
						onClick={() => void listQuery.refetch()}
					>
						Retry
					</button>
				</p>
			)}

			<Card className="flex flex-col gap-3">
				<SearchInput
					placeholder="Search fields (name, group, context, type)…"
					aria-label="Search fields"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="max-w-md flex-1"
				/>

				<FloatingBar
					open={checkedIds.size > 0}
					selectedCount={checkedIds.size}
					onClearSelection={clearSelection}
					onDelete={handleBulkDelete}
				/>

				<InfiniteTable
					data={rows}
					columns={[...columns, actionsColumn]}
					height="calc(100vh - 200px)"
					onLoadMore={loadMore}
					isLoading={isLoadingMore}
					isInitialLoading={isInitialLoading}
					hasMore={hasMore}
					onRowClick={(row) => void navigate(`/configure/fields/${row.id}`)}
					checkboxConfig={{
						getRowId: (row) => row.id,
						checkedIds,
						setCheckedIds,
					}}
				/>

				<ConfirmModal
					open={fieldPendingDelete !== null}
					onClose={() => setFieldPendingDelete(null)}
					title="Delete this field?"
					confirmLabel="Delete"
					cancelLabel="Cancel"
					confirmDanger
					pending={deleteFieldMutation.isPending}
					onConfirm={confirmDeleteField}
				>
					<p className="mb-0">
						<span className="font-medium text-neutral-800 dark:text-neutral-100">
							{fieldPendingDelete?.name ? `“${fieldPendingDelete.name}”` : "This field"}
						</span>{" "}
						will be removed. This cannot be undone.
					</p>
				</ConfirmModal>
			</Card>
		</CardMain>
	);
};
