import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import { SearchInput } from "../../components/form-input/SearchInput";
import cn from "classnames";
import {
	useAgreementTeamsQuery,
	usePatchAgreementTeamMembersMutation,
	useUsersInfiniteList,
	type AgreementTeamEntry,
	type AgreementTeamUser,
} from "../../api";
import { Button } from "../../components/base/Button";
import { UserIdentity } from "../../components/UserIdentity";
import { ConfirmModal } from "../../components/base/ConfirmModal";
import { FloatingBar } from "../../components/base/FloatingBar";
import { InfiniteTable } from "../../components/base/InfiniteTable";
import { Modal } from "../../components/base/Modal";
import { AgreementTeamsSkeleton } from "../../components/skeletons";
import { Typography } from "../../components/base/Typography";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import type { SettingsUserListRow } from "../../schemas/settingsUser";

export interface AgreementTeamsStepPanelProps {
	agreementId: string;
	/** Hide all member add/remove controls and show team rosters as read-only. */
	readOnly?: boolean;
}

type AddMembersTarget = {
	team: AgreementTeamEntry;
	teamId: string;
} | null;

function teamRefId(team: AgreementTeamEntry): string {
	return team.team?._id?.trim() ?? "";
}

function teamName(team: AgreementTeamEntry): string {
	return team.team?.name?.trim() || "Team";
}

function userId(user: AgreementTeamUser | null | undefined): string {
	return user?._id?.trim() ?? "";
}

function userDisplayName(user: AgreementTeamUser | null | undefined): string {
	if (!user) return "Unknown user";
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return fullName || user.username?.trim() || user.email?.trim() || user._id;
}

function userEmail(user: AgreementTeamUser | null | undefined): string {
	return user?.email?.trim() || "—";
}

function memberSelectionKey(teamId: string, memberId: string): string {
	return `${teamId}::${memberId}`;
}

function parseMemberSelectionKey(key: string): { teamId: string; memberId: string } | null {
	const sep = key.indexOf("::");
	if (sep <= 0) return null;
	const teamId = key.slice(0, sep).trim();
	const memberId = key.slice(sep + 2).trim();
	if (!teamId || !memberId) return null;
	return { teamId, memberId };
}

function groupMemberSelectionsByTeam(checkedKeys: Set<string>): Map<string, string[]> {
	const byTeam = new Map<string, string[]>();
	for (const key of checkedKeys) {
		const parsed = parseMemberSelectionKey(key);
		if (!parsed) continue;
		const list = byTeam.get(parsed.teamId) ?? [];
		list.push(parsed.memberId);
		byTeam.set(parsed.teamId, list);
	}
	return byTeam;
}

function rowToAgreementUser(row: SettingsUserListRow): AgreementTeamUser {
	return {
		_id: row.id,
		firstName: row.firstName,
		lastName: row.lastName,
		email: row.email,
		username: row.username === "—" ? undefined : row.username,
		profilePictureUrl: row.profilePictureUrl,
	};
}

function AddAgreementTeamMembersModal({
	open,
	team,
	pending,
	onClose,
	onSave,
}: {
	open: boolean;
	team: AgreementTeamEntry | null;
	pending: boolean;
	onClose: () => void;
	onSave: (add: string[], remove: string[]) => void | Promise<void>;
}) {
	const [search, setSearch] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const debouncedSearch = useDebouncedValue(search, 400);
	const targetTeamId = team ? teamRefId(team) : "";
	const currentMembers = useMemo(
		() =>
			(team?.members ?? [])
				.map((m) => m.user)
				.filter((u): u is AgreementTeamUser => Boolean(userId(u))),
		[team?.members]
	);
	const currentMemberIds = useMemo(() => currentMembers.map((u) => userId(u)).filter(Boolean), [currentMembers]);

	const usersQuery = useUsersInfiniteList({ q: debouncedSearch, sort: "firstName" });
	const loadedRows = useMemo(() => usersQuery.data?.pages.flatMap((p) => p.data) ?? [], [usersQuery.data]);
	const availableRows = useMemo(
		() => loadedRows.filter((u) => (u.teamIds ?? []).includes(targetTeamId)),
		[loadedRows, targetTeamId]
	);

	const candidateUsers = useMemo(() => {
		const byId = new Map<string, AgreementTeamUser>();
		for (const member of currentMembers) {
			byId.set(userId(member), member);
		}
		for (const row of availableRows) {
			byId.set(row.id, rowToAgreementUser(row));
		}
		return [...byId.values()].sort((a, b) => userDisplayName(a).localeCompare(userDisplayName(b)));
	}, [availableRows, currentMembers]);

	const wasOpenRef = useRef(false);
	useEffect(() => {
		if (open && !wasOpenRef.current) {
			setSearch("");
			setSelectedIds(new Set(currentMemberIds));
		}
		wasOpenRef.current = open;
	}, [currentMemberIds, open]);

	const memberColumns = useMemo((): ColumnDef<AgreementTeamUser, unknown>[] => {
		return [
			{
				id: "name",
				header: "Name",
				size: 200,
				minSize: 140,
				cell: ({ row }) => <UserIdentity user={row.original} />,
			},
			{
				id: "email",
				accessorFn: (u) => userEmail(u),
				header: "Email",
				size: 220,
				minSize: 160,
				cell: ({ row }) => userEmail(row.original),
			},
			{
				id: "username",
				accessorFn: (u) => u.username,
				header: "Username",
				size: 140,
				minSize: 100,
				cell: ({ row }) => row.original.username?.trim() || "—",
			},
		];
	}, []);

	const loadMoreMembers = useCallback(() => {
		if (usersQuery.hasNextPage && !usersQuery.isFetchingNextPage) {
			void usersQuery.fetchNextPage();
		}
	}, [usersQuery.hasNextPage, usersQuery.isFetchingNextPage, usersQuery.fetchNextPage]);

	const handleSave = useCallback(async () => {
		const original = new Set(currentMemberIds);
		const add = [...selectedIds].filter((id) => !original.has(id));
		const remove = currentMemberIds.filter((id) => !selectedIds.has(id));
		if (add.length === 0 && remove.length === 0) {
			onClose();
			return;
		}
		await Promise.resolve(onSave(add, remove));
	}, [currentMemberIds, onClose, onSave, selectedIds]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={760}
			header={
				<h2 className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					Add Members{team ? ` - ${teamName(team)}` : ""}
				</h2>
			}
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						onClick={onClose}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="md"
						appearance="filled"
						status="primary"
						loading={pending}
						disabled={pending || !targetTeamId}
						onClick={() => void handleSave()}
					>
						Save Members
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-3">
				<SearchInput
					placeholder="Search members…"
					aria-label="Search members"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-md"
				/>

				<InfiniteTable
					data={candidateUsers}
					columns={memberColumns}
					height={420}
					rowHeight={44}
					onLoadMore={loadMoreMembers}
					isLoading={usersQuery.isFetchingNextPage}
					isInitialLoading={usersQuery.isPending && candidateUsers.length === 0}
					hasMore={Boolean(usersQuery.hasNextPage)}
					skeletonRowCount={10}
					emptyMessage="No users found for this team."
					checkboxConfig={{
						getRowId: (u) => userId(u),
						checkedIds: selectedIds,
						setCheckedIds: setSelectedIds,
					}}
				/>
			</div>
		</Modal>
	);
}

type RemoveMembersPending =
	| { mode: "single"; teamId: string; memberId: string }
	| { mode: "bulk"; memberCount: number }
	| null;

function TeamMemberSelectAllCheckbox({
	teamId,
	memberIds,
	checkedKeys,
	onToggleAll,
}: {
	teamId: string;
	memberIds: string[];
	checkedKeys: Set<string>;
	onToggleAll: () => void;
}) {
	const ref = useRef<HTMLInputElement>(null);
	const allSelected = memberIds.length > 0 && memberIds.every((id) => checkedKeys.has(memberSelectionKey(teamId, id)));
	const someSelected = memberIds.some((id) => checkedKeys.has(memberSelectionKey(teamId, id)));

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.indeterminate = someSelected && !allSelected;
	}, [allSelected, someSelected]);

	if (memberIds.length === 0) return null;

	return (
		<input
			ref={ref}
			type="checkbox"
			checked={allSelected}
			onChange={onToggleAll}
			className="theme-checkbox"
			aria-label="Select all members in this team"
		/>
	);
}

export function AgreementTeamsStepPanel({ agreementId, readOnly = false }: AgreementTeamsStepPanelProps) {
	const teamsQuery = useAgreementTeamsQuery({ agreementId, enabled: Boolean(agreementId) });
	const patchMembersMutation = usePatchAgreementTeamMembersMutation();
	const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>({});
	const [addMembersTarget, setAddMembersTarget] = useState<AddMembersTarget>(null);
	const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() => new Set());
	const [removePending, setRemovePending] = useState<RemoveMembersPending>(null);

	useEffect(() => {
		if (!teamsQuery.isError) return;
		toast.error(formatUserFacingError(teamsQuery.error, "Could not load agreement teams."), {
			toastId: `agreement-teams-${agreementId}`,
		});
	}, [agreementId, teamsQuery.error, teamsQuery.isError]);

	const teams = teamsQuery.data?.teams ?? [];

	const validSelectionKeys = useMemo(() => {
		const keys = new Set<string>();
		for (const entry of teams) {
			const teamId = teamRefId(entry);
			if (!teamId) continue;
			for (const member of entry.members ?? []) {
				const memberId = userId(member.user);
				if (memberId) keys.add(memberSelectionKey(teamId, memberId));
			}
		}
		return keys;
	}, [teams]);

	useEffect(() => {
		setCheckedKeys((prev) => {
			const next = new Set<string>();
			for (const key of prev) {
				if (validSelectionKeys.has(key)) next.add(key);
			}
			return next.size === prev.size && [...prev].every((key) => next.has(key)) ? prev : next;
		});
	}, [validSelectionKeys]);

	const clearSelection = useCallback(() => setCheckedKeys(new Set()), []);

	const toggleMemberSelection = useCallback((teamId: string, memberId: string) => {
		const key = memberSelectionKey(teamId, memberId);
		setCheckedKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}, []);

	const toggleTeamSelectAll = useCallback((teamId: string, memberIds: string[]) => {
		setCheckedKeys((prev) => {
			const keys = memberIds.map((id) => memberSelectionKey(teamId, id));
			const allSelected = keys.length > 0 && keys.every((k) => prev.has(k));
			const next = new Set(prev);
			if (allSelected) {
				for (const k of keys) next.delete(k);
			} else {
				for (const k of keys) next.add(k);
			}
			return next;
		});
	}, []);

	const updateMembers = useCallback(
		async (teamId: string, add: string[], remove: string[]) => {
			if (!teamId || (add.length === 0 && remove.length === 0)) return;
			await patchMembersMutation.mutateAsync({
				agreementId,
				teamId,
				body: { add, remove },
			});
			toast.success("Team members updated.");
		},
		[agreementId, patchMembersMutation]
	);

	const handleSaveMembers = useCallback(
		async (add: string[], remove: string[]) => {
			if (!addMembersTarget?.teamId) return;
			try {
				await updateMembers(addMembersTarget.teamId, add, remove);
				setAddMembersTarget(null);
			} catch (e) {
				toast.error(formatUserFacingError(e, "Could not update team members."));
			}
		},
		[addMembersTarget?.teamId, updateMembers]
	);

	const handleRemoveConfirm = useCallback(async () => {
		if (!removePending) return;
		try {
			if (removePending.mode === "single") {
				await updateMembers(removePending.teamId, [], [removePending.memberId]);
				setCheckedKeys((prev) => {
					const next = new Set(prev);
					next.delete(memberSelectionKey(removePending.teamId, removePending.memberId));
					return next;
				});
			} else {
				const byTeam = groupMemberSelectionsByTeam(checkedKeys);
				for (const [teamId, memberIds] of byTeam) {
					await updateMembers(teamId, [], memberIds);
				}
				setCheckedKeys(new Set());
			}
			setRemovePending(null);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not remove team member(s)."));
		}
	}, [checkedKeys, removePending, updateMembers]);

	if (teamsQuery.isPending) {
		return <AgreementTeamsSkeleton />;
	}

	if (teamsQuery.isError) {
		return (
			<Typography size="small" className="text-error-600 dark:text-error-400">
				{formatUserFacingError(teamsQuery.error, "Could not load agreement teams.")}
			</Typography>
		);
	}

	if (teams.length === 0) {
		return (
			<p className="text-sm text-neutral-500 dark:text-neutral-400">
				No relevant teams are configured for this agreement.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{!readOnly ? (
				<FloatingBar
					open={checkedKeys.size > 0}
					selectedCount={checkedKeys.size}
					onClearSelection={clearSelection}
					deleteLabel="Remove"
					deletePending={patchMembersMutation.isPending}
					onDelete={() => {
						if (checkedKeys.size === 0) return;
						setRemovePending({
							mode: "bulk",
							memberCount: checkedKeys.size,
						});
					}}
				/>
			) : null}

			{teams.map((entry) => {
				const teamId = teamRefId(entry);
				const key = entry.id || teamId || teamName(entry);
				const collapsed = collapsedById[key] === true;
				const members = (entry.members ?? []).filter((m) => userId(m.user));
				const teamMemberIds = members.map((m) => userId(m.user)).filter(Boolean);
				return (
					<div
						key={key}
						className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-black-600 dark:bg-black-800"
					>
						<div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-primary-400 px-4 py-3">
							<div className="flex min-w-0 items-center gap-2">
								<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-200">
									{teamName(entry).slice(0, 1).toUpperCase()}
								</span>
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<h3 className="mb-0 truncate text-sm font-semibold text-neutral-900 dark:text-white">
											{teamName(entry)}
										</h3>
										<span className="text-xs text-neutral-500 dark:text-neutral-400">
											{entry.memberCount ?? members.length}
										</span>
									</div>
									{entry.team?.description?.trim() ? (
										<p className="mb-0 mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
											{entry.team.description.trim()}
										</p>
									) : null}
								</div>
							</div>
							<div className="flex items-center gap-2">
								{readOnly ? null : (
									<Button
										type="button"
										size="sm"
										appearance="filled"
										status="secondary-neutral"
										disabled={!teamId}
										onClick={() => setAddMembersTarget({ team: entry, teamId })}
									>
										<AddOutlinedIcon sx={{ fontSize: 14 }} />
										Add Members
									</Button>
								)}
								<button
									type="button"
									aria-label={collapsed ? "Expand team" : "Collapse team"}
									className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-black-600"
									onClick={() => setCollapsedById((prev) => ({ ...prev, [key]: !collapsed }))}
								>
									<ExpandMoreOutlinedIcon
										sx={{ fontSize: 20 }}
										className={cn("transition-transform", collapsed ? "rotate-0" : "rotate-180")}
									/>
								</button>
							</div>
						</div>

						{collapsed ? null : (
							<div className="overflow-auto border-t border-neutral-200 dark:border-black-600">
								<table className="w-full min-w-[640px] border-collapse text-left text-sm">
									<thead className="bg-neutral-50 dark:bg-black-800">
										<tr className="border-b border-neutral-200 dark:border-black-600">
											{readOnly ? null : (
												<th className="w-12 px-3 py-2.5">
													<TeamMemberSelectAllCheckbox
														teamId={teamId}
														memberIds={teamMemberIds}
														checkedKeys={checkedKeys}
														onToggleAll={() => toggleTeamSelectAll(teamId, teamMemberIds)}
													/>
												</th>
											)}
											<th className="px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
												Name
											</th>
											<th className="px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
												Email
											</th>
											<th className="px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
												Username
											</th>
											{readOnly ? null : (
												<th className="w-20 px-4 py-2.5 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">
													<span className="sr-only">Actions</span>
												</th>
											)}
										</tr>
									</thead>
									<tbody>
										{members.length === 0 ? (
											<tr className="bg-white dark:bg-black-800">
												<td
													colSpan={readOnly ? 3 : 5}
													className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
												>
													No members added to this agreement team.
												</td>
											</tr>
										) : (
											members.map((member) => {
												const memberId = userId(member.user);
												const selectionKey = memberSelectionKey(teamId, memberId);
												return (
													<tr
														key={memberId}
														className="border-b border-neutral-100 bg-white hover:bg-neutral-50 dark:border-black-600 dark:bg-black-800 dark:hover:bg-black-700/50"
													>
														{readOnly ? null : (
															<td className="px-3 py-2.5">
																<input
																	type="checkbox"
																	checked={checkedKeys.has(selectionKey)}
																	onChange={() => toggleMemberSelection(teamId, memberId)}
																	className="theme-checkbox"
																	aria-label={`Select ${userDisplayName(member.user)}`}
																/>
															</td>
														)}
														<td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-white">
															<UserIdentity user={member.user} />
														</td>
														<td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
															{userEmail(member.user)}
														</td>
														<td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
															{member.user?.username?.trim() || "—"}
														</td>
														{readOnly ? null : (
															<td className="px-4 py-2.5 text-right">
																<button
																	type="button"
																	disabled={!teamId || patchMembersMutation.isPending}
																	className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 disabled:pointer-events-none disabled:opacity-50 dark:text-error-400 dark:hover:bg-error-950/30"
																	onClick={() =>
																		setRemovePending({ mode: "single", teamId, memberId })
																	}
																>
																	<DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
																	Remove
																</button>
															</td>
														)}
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						)}
					</div>
				);
			})}

			{readOnly ? null : (
				<AddAgreementTeamMembersModal
					open={addMembersTarget !== null}
					team={addMembersTarget?.team ?? null}
					pending={patchMembersMutation.isPending}
					onClose={() => setAddMembersTarget(null)}
					onSave={handleSaveMembers}
				/>
			)}

			<ConfirmModal
				open={removePending !== null}
				onClose={() => setRemovePending(null)}
				title={
					removePending?.mode === "bulk"
						? `Remove ${removePending.memberCount} member${removePending.memberCount === 1 ? "" : "s"}?`
						: "Remove this team member?"
				}
				confirmLabel="Remove"
				cancelLabel="Cancel"
				confirmDanger
				pending={patchMembersMutation.isPending}
				onConfirm={() => void handleRemoveConfirm()}
			>
				{removePending?.mode === "bulk" ? (
					<p className="mb-0 text-neutral-700 dark:text-neutral-300">
						{removePending.memberCount} selected member{removePending.memberCount === 1 ? "" : "s"} will be
						removed from this agreement.
					</p>
				) : (
					<p className="mb-0 text-neutral-700 dark:text-neutral-300">
						This member will be removed from the agreement team. They are not deleted from the organization.
					</p>
				)}
			</ConfirmModal>
		</div>
	);
}
