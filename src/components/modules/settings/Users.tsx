import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { Modal as AntdModal } from "antd";
import { toast } from "react-toastify";
import { useQuery } from "@tanstack/react-query";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ModeEditOutlinedIcon from "@mui/icons-material/ModeEditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { Card } from "../../base/Card";
import { Button } from "../../base/Button";
import { ConfirmModal } from "../../base/ConfirmModal";
import { InfiniteTable } from "../../base/InfiniteTable";
import { FloatingBar } from "../../base/FloatingBar";
import { useColumns, type ColumnConfig } from "../../../hooks/useColumns";
import { formatUsDateTime } from "../../../lib/formatDateTime";
import { useDebouncedValue } from "../../../lib/useDebouncedValue";
import { formatUserFacingError } from "../../../lib/formatUserFacingError";
import type { SettingsUserListRow } from "../../../schemas/settingsUser";
import {
	listGroups,
	listTeams,
	queryKeys,
	useBulkDeleteUsersMutation,
	useCreateUserMutation,
	useDeleteUserMutation,
	useUpdateUserMutation,
	useUsersInfiniteList,
} from "../../../api";
import { toastBulkDeleteResult } from "../../../lib/bulkDeleteFeedback";
import { NewUserModal } from "./NewUserModal";
import { createStickyActionsColumn } from "./stickyActionsColumn";

const userColumnConfigs: ColumnConfig<SettingsUserListRow>[] = [
	{ key: "displayName", name: "User", width: 200, minWidth: 120 },
	{ key: "username", name: "Username", width: 160, minWidth: 100 },
	{ key: "email", name: "Email", width: 220, minWidth: 160 },
	{ key: "groupName", name: "Group", width: 160, minWidth: 100 },
	{ key: "teamsSummary", name: "Teams", width: 220, minWidth: 120 },
	{ key: "role", name: "Role", width: 120, minWidth: 80 },
	{
		key: "createdAt",
		name: "Created On",
		width: 180,
		minWidth: 140,
		cell: ({ getValue }) => formatUsDateTime(String(getValue())),
	},
];

function UserRowMenu({
	user,
	onEdit,
	onDeleteRequest,
}: {
	user: SettingsUserListRow;
	onEdit: (u: SettingsUserListRow) => void;
	onDeleteRequest: (u: SettingsUserListRow) => void;
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
						if (key === "edit") onEdit(user);
						if (key === "delete") onDeleteRequest(user);
					},
				}}
			>
				<button
					type="button"
					aria-label="User actions"
					className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
				>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</button>
			</Dropdown>
		</div>
	);
}

export interface SettingsUsersProps {
	search: string;
	onSearchChange: (v: string) => void;
}

export const Users = ({ search, onSearchChange }: SettingsUsersProps) => {
	const createUserMutation = useCreateUserMutation();
	const updateUserMutation = useUpdateUserMutation();
	const deleteUserMutation = useDeleteUserMutation();
	const bulkDeleteUsersMutation = useBulkDeleteUsersMutation();
	const [newUserOpen, setNewUserOpen] = useState(false);
	const [editUser, setEditUser] = useState<SettingsUserListRow | null>(null);
	const [userFormKey, setUserFormKey] = useState(0);
	const [userPendingDelete, setUserPendingDelete] = useState<SettingsUserListRow | null>(null);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
	const debouncedSearch = useDebouncedValue(search, 500);

	const listQuery = useUsersInfiniteList({ q: debouncedSearch, sort: "-createdAt" });

	const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const loadMore = useCallback(() => {
		void listQuery.fetchNextPage();
	}, [listQuery]);

	const pickersOpen = newUserOpen || editUser !== null;

	const groupsPicker = useQuery({
		queryKey: [...queryKeys.groups.all, "picker", 100] as const,
		queryFn: () => listGroups({ page: 1, limit: 100, sort: "name" }),
		enabled: pickersOpen,
		staleTime: 60_000,
	});

	const teamsPicker = useQuery({
		queryKey: [...queryKeys.teams.all, "picker", 100] as const,
		queryFn: () => listTeams({ page: 1, limit: 100, sort: "name" }),
		enabled: pickersOpen,
		staleTime: 60_000,
	});

	const groupOptions = useMemo(
		() => groupsPicker.data?.data.map((g) => ({ label: g.name, value: g.id })) ?? [],
		[groupsPicker.data]
	);

	const teamOptions = useMemo(
		() => teamsPicker.data?.data.map((t) => ({ label: t.name, value: t.id })) ?? [],
		[teamsPicker.data]
	);

	const optionsLoading = groupsPicker.isPending || teamsPicker.isPending;

	const baseColumns = useColumns(userColumnConfigs);

	const handleEditUser = useCallback((user: SettingsUserListRow) => {
		setUserFormKey((k) => k + 1);
		setNewUserOpen(false);
		setEditUser(user);
	}, []);

	const requestDeleteUser = useCallback((user: SettingsUserListRow) => {
		setUserPendingDelete(user);
	}, []);

	const confirmDeleteUser = useCallback(async () => {
		if (!userPendingDelete) return;
		try {
			await deleteUserMutation.mutateAsync(userPendingDelete.id);
			toast.success("User deleted");
			setUserPendingDelete(null);
			setCheckedIds((prev) => {
				const next = new Set(prev);
				next.delete(userPendingDelete.id);
				return next;
			});
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete user"));
		}
	}, [deleteUserMutation, userPendingDelete]);

	const actionsColumn = useMemo(
		() =>
			createStickyActionsColumn<SettingsUserListRow>((ctx) => (
				<UserRowMenu
					user={ctx.row.original}
					onEdit={handleEditUser}
					onDeleteRequest={requestDeleteUser}
				/>
			)),
		[handleEditUser, requestDeleteUser]
	);

	const columns = useMemo(() => [...baseColumns, actionsColumn], [baseColumns, actionsColumn]);

	const showInitialLoading = listQuery.isPending && rows.length === 0;

	useEffect(() => {
		if (!listQuery.isError) return;
		toast.error(formatUserFacingError(listQuery.error, "Could not load users."), {
			toastId: "settings-users-list",
		});
	}, [listQuery.isError, listQuery.error]);

	const clearSelection = useCallback(() => {
		setCheckedIds(new Set());
	}, []);

	const userModalOpen = newUserOpen || editUser !== null;
	const userModalVariant = editUser ? "edit" : "create";
	const userModalPending =
		userModalVariant === "edit" ? updateUserMutation.isPending : createUserMutation.isPending;

	const closeUserModal = useCallback(() => {
		setNewUserOpen(false);
		setEditUser(null);
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
							placeholder="Search users (name, email, username)"
							className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500"
						/>
					</div>
				</div>
				<Button
					type="button"
					size="md"
					onClick={() => {
						setUserFormKey((k) => k + 1);
						setEditUser(null);
						setNewUserOpen(true);
					}}
				>
					<AddOutlinedIcon sx={{ fontSize: 14 }} />
					New user
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
				title="Delete selected users?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={bulkDeleteUsersMutation.isPending}
				onConfirm={async () => {
					if (!bulkDeleteIds?.length) return;
					try {
						const res = await bulkDeleteUsersMutation.mutateAsync(bulkDeleteIds);
						toastBulkDeleteResult(res, "user", "users", "No users were deleted.");
						setCheckedIds((prev) => {
							const next = new Set(prev);
							res.deleted.forEach((id) => next.delete(id));
							return next;
						});
						setBulkDeleteIds(null);
					} catch (e) {
						toast.error(formatUserFacingError(e, "Could not delete users"));
					}
				}}
			>
				<p className="mb-0">
					Permanently delete{" "}
					<span className="font-medium text-neutral-800 dark:text-neutral-100">
						{bulkDeleteIds?.length ?? 0} selected user(s)
					</span>
					? Some accounts may be skipped if the server cannot remove them.
				</p>
			</ConfirmModal>

			<ConfirmModal
				open={userPendingDelete !== null}
				onClose={() => setUserPendingDelete(null)}
				title="Delete this user?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={deleteUserMutation.isPending}
				onConfirm={confirmDeleteUser}
			>
				<p className="mb-0">
					<span className="font-medium text-neutral-800 dark:text-neutral-100">
						{userPendingDelete?.displayName ? `“${userPendingDelete.displayName}”` : "This user"}
					</span>{" "}
					will be removed. This cannot be undone.
				</p>
			</ConfirmModal>

			<NewUserModal
				key={userFormKey}
				open={userModalOpen}
				variant={userModalVariant}
				initialValues={
					editUser
						? {
								firstName: editUser.firstName ?? "",
								lastName: editUser.lastName ?? "",
								email: editUser.email,
								groupId: editUser.groupId ?? "",
								teamIds: editUser.teamIds ?? [],
							}
						: undefined
				}
				onClose={closeUserModal}
				pending={userModalPending}
				groupOptions={groupOptions}
				teamOptions={teamOptions}
				optionsLoading={optionsLoading}
				onSubmit={async ({ firstName, lastName, email, group, teams, mustChangePassword }) => {
					try {
						if (editUser) {
							await updateUserMutation.mutateAsync({
								id: editUser.id,
								firstName,
								lastName,
								email,
								group,
								teams,
							});
							toast.success("User updated");
						} else {
							const res = await createUserMutation.mutateAsync({
								firstName,
								lastName,
								email,
								group,
								teams,
								mustChangePassword: mustChangePassword ?? true,
							});
							toast.success("User created");
							AntdModal.success({
								title: "Save sign-in details",
								width: 480,
								content: (
									<div className="flex flex-col gap-2 text-sm text-neutral-800 dark:text-neutral-200">
										<p>
											<span className="font-medium text-neutral-600 dark:text-neutral-300">
												Username:{" "}
											</span>
											<code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-black-700">
												{res.username}
											</code>
										</p>
										<p>
											<span className="font-medium text-neutral-600 dark:text-neutral-300">
												Temporary password:{" "}
											</span>
											<code className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-black-700">
												{res.temporaryPassword}
											</code>
										</p>
										<p className="text-xs text-neutral-500 dark:text-neutral-400">
											This password is only shown once. Share it with the user securely.
										</p>
									</div>
								),
							});
						}
					} catch (e) {
						toast.error(
							formatUserFacingError(
								e,
								editUser ? "Could not update user" : "Could not create user"
							)
						);
						throw e;
					}
				}}
			/>
		</Card>
	);
};
