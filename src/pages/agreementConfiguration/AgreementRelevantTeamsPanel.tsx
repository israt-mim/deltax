import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { Switch } from "antd";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { useTeamsInfiniteList } from "../../api";
import { resolveAgreementRelevantTeamId, type AgreementConfigApi } from "../../api/services/agreementConfigs";
import { InfiniteTable } from "../../components/base/InfiniteTable";
import { FloatingBar } from "../../components/base/FloatingBar";
import { createStickyActionsColumn } from "../../components/modules/settings/stickyActionsColumn";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import type { Team } from "../../schemas/team";

export type AgreementRelevantTeamDraftEntry = { addAllMembers: boolean; canCreate: boolean };

export interface AgreementRelevantTeamsPanelProps {
	config: AgreementConfigApi | undefined;
	readOnly: boolean;
	relevantTeamIds: string[];
	draftSettings: Record<string, AgreementRelevantTeamDraftEntry>;
	onUpdateTeamSettings: (teamId: string, patch: Partial<AgreementRelevantTeamDraftEntry>) => void | Promise<void>;
	onRemoveTeam: (teamId: string) => void | Promise<void>;
}

function effectiveSettings(
	teamId: string,
	cfg: AgreementConfigApi | undefined,
	draft: Record<string, AgreementRelevantTeamDraftEntry | undefined>
): AgreementRelevantTeamDraftEntry {
	const d = draft[teamId];
	if (d) return d;
	const fromApi = cfg?.relevantTeams?.find((r) => resolveAgreementRelevantTeamId(r.team) === teamId);
	return {
		addAllMembers: fromApi?.addAllMembers ?? false,
		canCreate: fromApi?.canCreate ?? false,
	};
}

function placeholderTeam(id: string): Team {
	const short = id.length > 8 ? `${id.slice(0, 6)}…` : id;
	return {
		id,
		name: `Team ${short}`,
		description: "",
		numberOfUsers: 0,
		createdAt: "",
		updatedAt: "",
	};
}

type SortKey = "name" | "description" | "numberOfUsers";

export function AgreementRelevantTeamsPanel({
	config,
	readOnly,
	relevantTeamIds,
	draftSettings,
	onUpdateTeamSettings,
	onRemoveTeam,
}: AgreementRelevantTeamsPanelProps) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 400);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [sortKey, setSortKey] = useState<SortKey>("name");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

	const listQuery = useTeamsInfiniteList({
		q: "",
		sort: "name",
	});

	useEffect(() => {
		if (!listQuery.isError) return;
		toast.error(formatUserFacingError(listQuery.error, "Could not load teams."), {
			toastId: "agreement-relevant-teams-list",
		});
	}, [listQuery.isError, listQuery.error]);

	const rowsRaw = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const teamById = useMemo(() => new Map(rowsRaw.map((t) => [t.id, t])), [rowsRaw]);

	const unresolvedIds = useMemo(() => {
		return relevantTeamIds.filter((id) => id?.trim() && !teamById.has(id.trim()));
	}, [relevantTeamIds, teamById]);

	useEffect(() => {
		if (unresolvedIds.length === 0 || !listQuery.hasNextPage || listQuery.isFetchingNextPage) return;
		void listQuery.fetchNextPage();
	}, [listQuery, unresolvedIds.length]);

	const loadMore = useCallback(() => {
		void listQuery.fetchNextPage();
	}, [listQuery]);

	const orderedTeams = useMemo(() => {
		const seen = new Set<string>();
		const list: Team[] = [];
		for (const raw of relevantTeamIds) {
			const tid = raw?.trim();
			if (!tid || seen.has(tid)) continue;
			seen.add(tid);
			list.push(teamById.get(tid) ?? placeholderTeam(tid));
		}
		return list;
	}, [relevantTeamIds, teamById]);

	const filteredTeams = useMemo(() => {
		const q = debouncedSearch.trim().toLowerCase();
		if (!q) return orderedTeams;
		return orderedTeams.filter((t) => {
			const name = t.name.toLowerCase();
			const desc = (t.description ?? "").toLowerCase();
			return name.includes(q) || desc.includes(q) || t.id.toLowerCase().includes(q);
		});
	}, [debouncedSearch, orderedTeams]);

	const sortedRows = useMemo(() => {
		const arr = [...filteredTeams];
		const mul = sortDir === "asc" ? 1 : -1;
		arr.sort((a, b) => {
			let cmp = 0;
			if (sortKey === "name") cmp = a.name.localeCompare(b.name);
			else if (sortKey === "description") cmp = (a.description || "").localeCompare(b.description || "");
			else cmp = (a.numberOfUsers ?? 0) - (b.numberOfUsers ?? 0);
			return cmp * mul;
		});
		return arr;
	}, [filteredTeams, sortDir, sortKey]);

	const sortHeaderButton = useCallback(
		(label: string, key: SortKey) => (
			<button
				type="button"
				className="flex min-w-0 max-w-full items-center gap-1 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
				onClick={() => {
					if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
					else {
						setSortKey(key);
						setSortDir("asc");
					}
				}}
			>
				<span className="truncate">{label}</span>
				<svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 text-neutral-400">
					<path
						d="M2 4L5 7L8 4"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>
		),
		[sortKey]
	);

	const clearSelection = useCallback(() => setCheckedIds(new Set()), []);

	const columns = useMemo((): ColumnDef<Team, unknown>[] => {
		const cols: ColumnDef<Team, unknown>[] = [
			{
				id: "name",
				accessorKey: "name",
				header: () => sortHeaderButton("Team", "name"),
				size: 200,
				minSize: 120,
				cell: ({ row }) => (
					<span className="font-medium text-neutral-800 dark:text-neutral-100">{row.original.name}</span>
				),
			},
			{
				id: "description",
				accessorKey: "description",
				header: () => sortHeaderButton("Description", "description"),
				size: 260,
				minSize: 140,
				cell: ({ row }) => row.original.description?.trim() || "—",
			},
			{
				id: "numberOfUsers",
				accessorKey: "numberOfUsers",
				header: () => sortHeaderButton("Number Of Users", "numberOfUsers"),
				size: 140,
				minSize: 100,
				cell: ({ row }) => row.original.numberOfUsers ?? 0,
			},
			{
				id: "addAllMembers",
				header: "Add All Members",
				size: 160,
				minSize: 130,
				enableResizing: false,
				cell: ({ row }) => {
					const tid = row.original.id;
					const v = effectiveSettings(tid, config, draftSettings);
					return (
						<div data-row-click-ignore className="flex justify-center">
							<Switch
								size="small"
								checked={v.addAllMembers}
								disabled={readOnly}
								onChange={(checked) => void onUpdateTeamSettings(tid, { addAllMembers: checked })}
							/>
						</div>
					);
				},
			},
			{
				id: "canCreate",
				header: "Can Create",
				size: 130,
				minSize: 100,
				enableResizing: false,
				cell: ({ row }) => {
					const tid = row.original.id;
					const v = effectiveSettings(tid, config, draftSettings);
					return (
						<div data-row-click-ignore className="flex justify-center">
							<Switch
								size="small"
								checked={v.canCreate}
								disabled={readOnly}
								onChange={(checked) => void onUpdateTeamSettings(tid, { canCreate: checked })}
							/>
						</div>
					);
				},
			},
		];

		const actionsCol = createStickyActionsColumn<Team>((ctx) => {
			const team = ctx.row.original;
			const items: MenuProps["items"] = readOnly ? [] : [{ key: "remove", label: "Remove", danger: true }];
			return (
				<div className="flex items-center justify-center" data-row-click-ignore onClick={(e) => e.stopPropagation()}>
					<Dropdown
						trigger={["click"]}
						classNames={{ root: "actions-dropdown-icon" }}
						menu={{
							items,
							onClick: ({ key, domEvent }) => {
								domEvent.preventDefault();
								domEvent.stopPropagation();
								if (key === "remove") void onRemoveTeam(team.id);
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
		});

		return [...cols, actionsCol];
	}, [config, draftSettings, onRemoveTeam, onUpdateTeamSettings, readOnly, sortHeaderButton]);

	const showInitialLoading = relevantTeamIds.length > 0 && listQuery.isPending && rowsRaw.length === 0;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 flex-wrap items-center gap-2">
					<div className="flex min-w-[200px] max-w-md flex-1 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 dark:border-black-600 dark:bg-black-800">
						<SearchOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-400 shrink-0" />
						<input
							type="search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search (use * as a wildcard)"
							className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500"
						/>
					</div>
				</div>
			</div>

			<FloatingBar open={checkedIds.size > 0} selectedCount={checkedIds.size} onClearSelection={clearSelection} items={<></>} />

			<InfiniteTable
				data={sortedRows}
				columns={columns}
				height="min(420px, calc(100vh - 380px))"
				rowHeight={44}
				onLoadMore={loadMore}
				isLoading={listQuery.isFetchingNextPage}
				hasMore={listQuery.hasNextPage ?? false}
				isInitialLoading={showInitialLoading}
				skeletonRowCount={Math.min(12, Math.max(relevantTeamIds.length, 6))}
				checkboxConfig={{
					getRowId: (row) => row.id,
					checkedIds,
					setCheckedIds,
				}}
				emptyMessage="No data available"
			/>
		</div>
	);
}
