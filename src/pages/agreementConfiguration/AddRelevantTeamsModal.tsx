import { useCallback, useEffect, useMemo, useState } from "react";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { useTeamsInfiniteList } from "../../api";
import { Button } from "../../components/base/Button";
import { InfiniteTable } from "../../components/base/InfiniteTable";
import { Modal } from "../../components/base/Modal";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import type { Team } from "../../schemas/team";

export interface AddRelevantTeamsModalProps {
	open: boolean;
	onClose: () => void;
	/** Teams already linked — excluded from picker rows */
	excludedIds: readonly string[];
	pending?: boolean;
	onConfirm: (teams: Team[]) => void | Promise<void>;
}

export function AddRelevantTeamsModal({
	open,
	onClose,
	excludedIds,
	pending = false,
	onConfirm,
}: AddRelevantTeamsModalProps) {
	const excludedSet = useMemo(() => new Set(excludedIds.map((id) => id.trim()).filter(Boolean)), [excludedIds]);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 400);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

	const listQuery = useTeamsInfiniteList({
		q: debouncedSearch,
		sort: "name",
	});

	useEffect(() => {
		if (!open) {
			setSearch("");
			setCheckedIds(new Set());
		}
	}, [open]);

	useEffect(() => {
		if (!listQuery.isError) return;
		toast.error(formatUserFacingError(listQuery.error, "Could not load teams."), {
			toastId: "add-relevant-teams-modal",
		});
	}, [listQuery.isError, listQuery.error]);

	const rowsRaw = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const rows = useMemo(
		() => rowsRaw.filter((row) => !excludedSet.has(row.id)),
		[excludedSet, rowsRaw]
	);

	const loadMore = useCallback(() => {
		void listQuery.fetchNextPage();
	}, [listQuery]);

	const selectedTeams = useMemo(() => rowsRaw.filter((r) => checkedIds.has(r.id)), [checkedIds, rowsRaw]);

	const columns = useMemo((): ColumnDef<Team, unknown>[] => {
		return [
			{
				id: "name",
				accessorKey: "name",
				header: "Team",
				size: 200,
				minSize: 140,
				cell: ({ row }) => (
					<span className="font-medium text-neutral-800 dark:text-neutral-100">{row.original.name}</span>
				),
			},
			{
				id: "description",
				accessorKey: "description",
				header: "Description",
				size: 240,
				minSize: 120,
				cell: ({ row }) => row.original.description?.trim() || "—",
			},
			{
				id: "numberOfUsers",
				accessorKey: "numberOfUsers",
				header: "Number Of Users",
				size: 120,
				minSize: 100,
				cell: ({ row }) => row.original.numberOfUsers ?? 0,
			},
		];
	}, []);

	const showInitialLoading = listQuery.isPending && rows.length === 0;

	const handleConfirm = useCallback(async () => {
		if (selectedTeams.length === 0) return;
		await onConfirm(selectedTeams);
	}, [onConfirm, selectedTeams]);

	const titleId = "add-relevant-teams-modal-title";

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={800}
			destroyOnHidden
			maskClosable={!pending}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					Add teams
				</h2>
			}
			footer={
				<div className="flex justify-end gap-2">
					<Button type="button" size="md" appearance="outlined" status="secondary-neutral" disabled={pending} onClick={onClose}>
						Cancel
					</Button>
					<Button
						type="button"
						size="md"
						appearance="filled"
						status="primary"
						disabled={pending || selectedTeams.length === 0}
						loading={pending}
						onClick={() => void handleConfirm()}
					>
						Add teams
						{selectedTeams.length > 0 ? ` (${selectedTeams.length})` : ""}
					</Button>
				</div>
			}
			aria-labelledby={titleId}
		>
			<div className="flex flex-col gap-3">
				<div className="flex min-w-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 dark:border-black-600 dark:bg-black-800">
					<SearchOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 text-neutral-400" />
					<input
						type="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search (use * as a wildcard)"
						className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500"
					/>
				</div>
				<InfiniteTable
					data={rows}
					columns={columns}
					height={360}
					rowHeight={44}
					onLoadMore={loadMore}
					isLoading={listQuery.isFetchingNextPage}
					hasMore={listQuery.hasNextPage ?? false}
					isInitialLoading={showInitialLoading}
					skeletonRowCount={10}
					checkboxConfig={{
						getRowId: (row) => row.id,
						checkedIds,
						setCheckedIds,
					}}
				/>
			</div>
		</Modal>
	);
}
