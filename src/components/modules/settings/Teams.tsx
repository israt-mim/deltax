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
import type { Team } from "../../../schemas/team";
import {
	useBulkDeleteTeamsMutation,
	useCreateTeamMutation,
	useDeleteTeamMutation,
	useTeamsInfiniteList,
	useUpdateTeamMutation,
} from "../../../api";
import { toastBulkDeleteResult } from "../../../lib/bulkDeleteFeedback";
import { NewTeamModal } from "./NewTeamModal";
import { createStickyActionsColumn } from "./stickyActionsColumn";

const teamColumnConfigs: ColumnConfig<Team>[] = [
	{ key: "name", name: "Team", width: 200, minWidth: 120 },
	{
		key: "groupTechnicalName",
		name: "Group key",
		width: 160,
		minWidth: 100,
		cell: ({ getValue }) => {
			const v = getValue() as string | undefined;
			return v && v !== "" ? v : "—";
		},
	},
	{ key: "numberOfUsers", name: "Number Of Users", width: 140, minWidth: 100 },
	{ key: "description", name: "Description", width: 260, minWidth: 140 },
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

function TeamRowMenu({
	team,
	onEdit,
	onDeleteRequest,
}: {
	team: Team;
	onEdit: (t: Team) => void;
	onDeleteRequest: (t: Team) => void;
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
						if (key === "edit") onEdit(team);
						if (key === "delete") onDeleteRequest(team);
					},
				}}
			>
				<button
					type="button"
					aria-label="Team actions"
					className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
				>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</button>
			</Dropdown>
		</div>
	);
}

export interface SettingsTeamsProps {
	search: string;
	onSearchChange: (v: string) => void;
}

export const Teams = ({ search, onSearchChange }: SettingsTeamsProps) => {
	const createTeamMutation = useCreateTeamMutation();
	const updateTeamMutation = useUpdateTeamMutation();
	const deleteTeamMutation = useDeleteTeamMutation();
	const bulkDeleteTeamsMutation = useBulkDeleteTeamsMutation();
	const [createOpen, setCreateOpen] = useState(false);
	const [editTeam, setEditTeam] = useState<Team | null>(null);
	/** Bumps when the team modal opens so the form remounts with the right initial values (no reset effect). */
	const [teamFormKey, setTeamFormKey] = useState(0);
	const [teamPendingDelete, setTeamPendingDelete] = useState<Team | null>(null);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
	const debouncedSearch = useDebouncedValue(search, 500);

	const listQuery = useTeamsInfiniteList({ q: debouncedSearch, sort: "-createdAt" });

	const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const loadMore = useCallback(() => {
		void listQuery.fetchNextPage();
	}, [listQuery]);

	const baseColumns = useColumns(teamColumnConfigs);

	const handleEditTeam = useCallback((team: Team) => {
		setTeamFormKey((k) => k + 1);
		setCreateOpen(false);
		setEditTeam(team);
	}, []);

	const requestDeleteTeam = useCallback((team: Team) => {
		setTeamPendingDelete(team);
	}, []);

	const confirmDeleteTeam = useCallback(async () => {
		if (!teamPendingDelete) return;
		try {
			await deleteTeamMutation.mutateAsync(teamPendingDelete.id);
			toast.success("Team deleted");
			setTeamPendingDelete(null);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete team"));
		}
	}, [deleteTeamMutation, teamPendingDelete]);

	const actionsColumn = useMemo(
		() =>
			createStickyActionsColumn<Team>((ctx) => (
				<TeamRowMenu team={ctx.row.original} onEdit={handleEditTeam} onDeleteRequest={requestDeleteTeam} />
			)),
		[handleEditTeam, requestDeleteTeam]
	);

	const columns = useMemo(() => [...baseColumns, actionsColumn], [baseColumns, actionsColumn]);

	const showInitialLoading = listQuery.isPending && rows.length === 0;

	const teamModalOpen = createOpen || editTeam !== null;
	const teamModalVariant = editTeam ? "edit" : "create";
	const teamModalPending =
		teamModalVariant === "edit" ? updateTeamMutation.isPending : createTeamMutation.isPending;

	useEffect(() => {
		if (!listQuery.isError) return;
		toast.error(formatUserFacingError(listQuery.error, "Could not load teams."), {
			toastId: "settings-teams-list",
		});
	}, [listQuery.isError, listQuery.error]);

	const closeTeamModal = useCallback(() => {
		setCreateOpen(false);
		setEditTeam(null);
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
							placeholder="Search teams (name or description)"
							className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500"
						/>
					</div>
				</div>
				<Button
					type="button"
					size="md"
					onClick={() => {
						setTeamFormKey((k) => k + 1);
						setEditTeam(null);
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
				title="Delete selected teams?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={bulkDeleteTeamsMutation.isPending}
				onConfirm={async () => {
					if (!bulkDeleteIds?.length) return;
					try {
						const res = await bulkDeleteTeamsMutation.mutateAsync(bulkDeleteIds);
						toastBulkDeleteResult(res, "team", "teams", "No teams were deleted.");
						setCheckedIds((prev) => {
							const next = new Set(prev);
							res.deleted.forEach((id) => next.delete(id));
							return next;
						});
						setBulkDeleteIds(null);
					} catch (e) {
						toast.error(formatUserFacingError(e, "Could not delete teams"));
					}
				}}
			>
				<p className="mb-0">
					Permanently delete{" "}
					<span className="font-medium text-neutral-800 dark:text-neutral-100">
						{bulkDeleteIds?.length ?? 0} selected team(s)
					</span>
					? Teams that are in use cannot be removed; those ids will be returned as skipped.
				</p>
			</ConfirmModal>

			<ConfirmModal
				open={teamPendingDelete !== null}
				onClose={() => setTeamPendingDelete(null)}
				title="Delete this team?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={deleteTeamMutation.isPending}
				onConfirm={confirmDeleteTeam}
			>
				<p className="mb-0">
					<span className="font-medium text-neutral-800 dark:text-neutral-100">
						{teamPendingDelete?.name ? `“${teamPendingDelete.name}”` : "This team"}
					</span>{" "}
					will be removed. This cannot be undone.
				</p>
			</ConfirmModal>

			<NewTeamModal
				key={teamFormKey}
				open={teamModalOpen}
				variant={teamModalVariant}
				initialValues={
					editTeam ? { name: editTeam.name, description: editTeam.description } : undefined
				}
				onClose={closeTeamModal}
				pending={teamModalPending}
				onSubmit={async ({ name, description }) => {
					try {
						if (editTeam) {
							await updateTeamMutation.mutateAsync({
								id: editTeam.id,
								name,
								description,
							});
							toast.success("Team updated");
						} else {
							await createTeamMutation.mutateAsync({ name, description });
							toast.success("Team created");
						}
					} catch (e) {
						toast.error(
							formatUserFacingError(
								e,
								editTeam ? "Could not update team" : "Could not create team"
							)
						);
						throw e;
					}
				}}
			/>
		</Card>
	);
};
