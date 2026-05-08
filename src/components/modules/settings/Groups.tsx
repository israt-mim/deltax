import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { toast } from "react-toastify";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ModeEditOutlinedIcon from "@mui/icons-material/ModeEditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { Card } from "../../base/Card";
import { Button } from "../../base/Button";
import { ConfirmModal } from "../../base/ConfirmModal";
import { FloatingBar } from "../../base/FloatingBar";
import { InfiniteTable } from "../../base/InfiniteTable";
import { useColumns, type ColumnConfig } from "../../../hooks/useColumns";
import { formatUsDateTime } from "../../../lib/formatDateTime";
import { useDebouncedValue } from "../../../lib/useDebouncedValue";
import { formatUserFacingError } from "../../../lib/formatUserFacingError";
import type { Group } from "../../../schemas/group";
import {
	useBulkDeleteGroupsMutation,
	useCreateGroupMutation,
	useDeleteGroupMutation,
	useGroupsInfiniteList,
	useUpdateGroupMutation,
} from "../../../api";
import { toastBulkDeleteResult } from "../../../lib/bulkDeleteFeedback";
import { NewGroupModal } from "./NewGroupModal";
import { createStickyActionsColumn } from "./stickyActionsColumn";

const groupColumnConfigs: ColumnConfig<Group>[] = [
	{ key: "name", name: "Group", width: 200, minWidth: 120 },
	{ key: "numberOfUsers", name: "Number Of Users", width: 140, minWidth: 100 },
	{ key: "description", name: "Description", width: 280, minWidth: 160 },
	{
		key: "createdAt",
		name: "Created On",
		width: 180,
		minWidth: 140,
		cell: ({ getValue }) => formatUsDateTime(String(getValue())),
	},
	{
		key: "updatedAt",
		name: "Updated On",
		width: 180,
		minWidth: 140,
		cell: ({ getValue }) => formatUsDateTime(String(getValue())),
	},
];

function GroupRowMenu({
	group,
	onEdit,
	onDeleteRequest,
}: {
	group: Group;
	onEdit: (g: Group) => void;
	onDeleteRequest: (g: Group) => void;
}) {
	const items: MenuProps["items"] = [
		{
			key: "edit",
			icon: (
				<ModeEditOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-600 dark:text-neutral-300" />
			),
			label: "Edit",
		},
		{ type: "divider" },
		{
			key: "delete",
			icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
			label: "Delete",
			danger: true,
		},
	];
	return (
		<div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
			<Dropdown
				trigger={["click"]}
				classNames={{ root: "actions-dropdown-icon" }}
				menu={{
					items,
					onClick: ({ key, domEvent }) => {
						domEvent.preventDefault();
						domEvent.stopPropagation();
						if (key === "edit") onEdit(group);
						if (key === "delete") onDeleteRequest(group);
					},
				}}
			>
				<button
					type="button"
					aria-label="Group actions"
					className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
				>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</button>
			</Dropdown>
		</div>
	);
}

export interface SettingsGroupsProps {
	search: string;
	onSearchChange: (v: string) => void;
}

export const Groups = ({ search, onSearchChange }: SettingsGroupsProps) => {
	const createGroupMutation = useCreateGroupMutation();
	const updateGroupMutation = useUpdateGroupMutation();
	const deleteGroupMutation = useDeleteGroupMutation();
	const bulkDeleteGroupsMutation = useBulkDeleteGroupsMutation();
	const [createOpen, setCreateOpen] = useState(false);
	const [editGroup, setEditGroup] = useState<Group | null>(null);
	const [groupFormKey, setGroupFormKey] = useState(0);
	const [groupPendingDelete, setGroupPendingDelete] = useState<Group | null>(null);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
	const debouncedSearch = useDebouncedValue(search, 500);

	const listQuery = useGroupsInfiniteList({ q: debouncedSearch, sort: "-createdAt" });

	const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const loadMore = useCallback(() => {
		void listQuery.fetchNextPage();
	}, [listQuery]);

	const baseColumns = useColumns(groupColumnConfigs);

	const handleEditGroup = useCallback((group: Group) => {
		setGroupFormKey((k) => k + 1);
		setCreateOpen(false);
		setEditGroup(group);
	}, []);

	const requestDeleteGroup = useCallback((group: Group) => {
		setGroupPendingDelete(group);
	}, []);

	const confirmDeleteGroup = useCallback(async () => {
		if (!groupPendingDelete) return;
		try {
			await deleteGroupMutation.mutateAsync(groupPendingDelete.id);
			toast.success("Group deleted");
			setGroupPendingDelete(null);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete group"));
		}
	}, [deleteGroupMutation, groupPendingDelete]);

	const actionsColumn = useMemo(
		() =>
			createStickyActionsColumn<Group>((ctx) => (
				<GroupRowMenu
					group={ctx.row.original}
					onEdit={handleEditGroup}
					onDeleteRequest={requestDeleteGroup}
				/>
			)),
		[handleEditGroup, requestDeleteGroup]
	);

	const columns = useMemo(() => [...baseColumns, actionsColumn], [baseColumns, actionsColumn]);

	const showInitialLoading = listQuery.isPending && rows.length === 0;

	const groupModalOpen = createOpen || editGroup !== null;
	const groupModalVariant = editGroup ? "edit" : "create";
	const groupModalPending =
		groupModalVariant === "edit" ? updateGroupMutation.isPending : createGroupMutation.isPending;

	useEffect(() => {
		if (!listQuery.isError) return;
		toast.error(formatUserFacingError(listQuery.error, "Could not load groups."), {
			toastId: "settings-groups-list",
		});
	}, [listQuery.isError, listQuery.error]);

	const closeGroupModal = useCallback(() => {
		setCreateOpen(false);
		setEditGroup(null);
	}, []);

	const clearSelection = useCallback(() => {
		setCheckedIds(new Set());
	}, []);

	return (
		<Card className="flex flex-col gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 flex-wrap items-center gap-2">
					<div className="flex min-w-[200px] max-w-md flex-1 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 dark:border-black-600 dark:bg-black-800">
						<SearchOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-400 shrink-0" />
						<input
							type="search"
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Search groups (name or description)"
							className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500"
						/>
					</div>
				</div>
				<Button
					type="button"
					size="md"
					onClick={() => {
						setGroupFormKey((k) => k + 1);
						setEditGroup(null);
						setCreateOpen(true);
					}}
				>
					<AddOutlinedIcon sx={{ fontSize: 14 }} />
					New
				</Button>
			</div>

			<FloatingBar
				open={checkedIds.size > 0}
				selectedCount={checkedIds.size}
				onClearSelection={clearSelection}
				onDelete={() => setBulkDeleteIds([...checkedIds])}
			/>

			<InfiniteTable
				data={rows}
				columns={columns}
				height="calc(100vh - 320px)"
				onLoadMore={loadMore}
				isLoading={listQuery.isFetchingNextPage}
				hasMore={listQuery.hasNextPage}
				isInitialLoading={showInitialLoading}
				skeletonRowCount={12}
				checkboxConfig={{
					getRowId: (row) => row.id,
					checkedIds,
					setCheckedIds,
				}}
			/>

			<ConfirmModal
				open={bulkDeleteIds !== null}
				onClose={() => setBulkDeleteIds(null)}
				title="Delete selected groups?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={bulkDeleteGroupsMutation.isPending}
				onConfirm={async () => {
					if (!bulkDeleteIds?.length) return;
					try {
						const res = await bulkDeleteGroupsMutation.mutateAsync(bulkDeleteIds);
						toastBulkDeleteResult(res, "group", "groups", "No groups were deleted.");
						setCheckedIds((prev) => {
							const next = new Set(prev);
							res.deleted.forEach((id) => next.delete(id));
							return next;
						});
						setBulkDeleteIds(null);
					} catch (e) {
						toast.error(formatUserFacingError(e, "Could not delete groups"));
					}
				}}
			>
				<p className="mb-0">
					Permanently delete{" "}
					<span className="font-medium text-neutral-800 dark:text-neutral-100">
						{bulkDeleteIds?.length ?? 0} selected group(s)
					</span>
					? Groups that are in use cannot be removed; those ids will be returned as skipped.
				</p>
			</ConfirmModal>

			<ConfirmModal
				open={groupPendingDelete !== null}
				onClose={() => setGroupPendingDelete(null)}
				title="Delete this group?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={deleteGroupMutation.isPending}
				onConfirm={confirmDeleteGroup}
			>
				<p className="mb-0">
					<span className="font-medium text-neutral-800 dark:text-neutral-100">
						{groupPendingDelete?.name ? `“${groupPendingDelete.name}”` : "This group"}
					</span>{" "}
					will be removed. This cannot be undone.
				</p>
			</ConfirmModal>

			<NewGroupModal
				key={groupFormKey}
				open={groupModalOpen}
				variant={groupModalVariant}
				initialValues={
					editGroup ? { name: editGroup.name, description: editGroup.description } : undefined
				}
				onClose={closeGroupModal}
				pending={groupModalPending}
				onSubmit={async ({ name, description }) => {
					try {
						if (editGroup) {
							await updateGroupMutation.mutateAsync({
								id: editGroup.id,
								name,
								description,
							});
							toast.success("Group updated");
						} else {
							await createGroupMutation.mutateAsync({ name, description });
							toast.success("Group created");
						}
					} catch (e) {
						toast.error(
							formatUserFacingError(
								e,
								editGroup ? "Could not update group" : "Could not create group"
							)
						);
						throw e;
					}
				}}
			/>
		</Card>
	);
};
