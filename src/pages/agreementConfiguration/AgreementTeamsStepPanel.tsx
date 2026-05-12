import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import cn from "classnames";
import {
	useAgreementTeamsQuery,
	usePatchAgreementTeamMembersMutation,
	useUsersInfiniteList,
	type AgreementTeamEntry,
	type AgreementTeamUser,
} from "../../api";
import { Button } from "../../components/base/Button";
import { Modal } from "../../components/base/Modal";
import { PageLoader } from "../../components/base/PageLoader";
import { Typography } from "../../components/base/Typography";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import type { SettingsUserListRow } from "../../schemas/settingsUser";

export interface AgreementTeamsStepPanelProps {
	agreementId: string;
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

function rowToAgreementUser(row: SettingsUserListRow): AgreementTeamUser {
	return {
		_id: row.id,
		firstName: row.firstName,
		lastName: row.lastName,
		email: row.email,
		username: row.username === "—" ? undefined : row.username,
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

	useEffect(() => {
		if (!open) return;
		setSearch("");
		setSelectedIds(new Set(currentMemberIds));
	}, [currentMemberIds, open]);

	const toggleUser = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

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
				<div className="flex min-w-[200px] items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 dark:border-black-600 dark:bg-black-800">
					<SearchOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 text-neutral-400" />
					<input
						type="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search members"
						className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500"
					/>
				</div>

				<div className="max-h-[420px] overflow-auto rounded-lg border border-neutral-200 dark:border-black-600">
					<table className="w-full min-w-[560px] border-collapse text-left text-sm">
						<thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-black-800">
							<tr className="border-b border-neutral-200 dark:border-black-600">
								<th className="w-12 px-3 py-2.5">
									<span className="sr-only">Select</span>
								</th>
								<th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Name
								</th>
								<th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Email
								</th>
								<th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									Username
								</th>
							</tr>
						</thead>
						<tbody>
							{candidateUsers.length === 0 ? (
								<tr className="bg-white dark:bg-black-800">
									<td colSpan={4} className="px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
										{usersQuery.isPending ? "Loading members..." : "No users found for this team."}
									</td>
								</tr>
							) : (
								candidateUsers.map((u) => {
									const id = userId(u);
									return (
										<tr key={id} className="border-b border-neutral-100 bg-white dark:border-black-600 dark:bg-black-800">
											<td className="px-3 py-2.5">
												<input
													type="checkbox"
													checked={selectedIds.has(id)}
													onChange={() => toggleUser(id)}
													className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400 dark:border-black-500"
													aria-label={`Select ${userDisplayName(u)}`}
												/>
											</td>
											<td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-white">
												{userDisplayName(u)}
											</td>
											<td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">{userEmail(u)}</td>
											<td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">{u.username?.trim() || "—"}</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{usersQuery.hasNextPage ? (
					<div className="flex justify-center">
						<Button
							type="button"
							size="sm"
							appearance="outlined"
							status="secondary-neutral"
							loading={usersQuery.isFetchingNextPage}
							onClick={() => void usersQuery.fetchNextPage()}
						>
							Load more users
						</Button>
					</div>
				) : null}
			</div>
		</Modal>
	);
}

export function AgreementTeamsStepPanel({ agreementId }: AgreementTeamsStepPanelProps) {
	const teamsQuery = useAgreementTeamsQuery({ agreementId, enabled: Boolean(agreementId) });
	const patchMembersMutation = usePatchAgreementTeamMembersMutation();
	const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>({});
	const [addMembersTarget, setAddMembersTarget] = useState<AddMembersTarget>(null);

	useEffect(() => {
		if (!teamsQuery.isError) return;
		toast.error(formatUserFacingError(teamsQuery.error, "Could not load agreement teams."), {
			toastId: `agreement-teams-${agreementId}`,
		});
	}, [agreementId, teamsQuery.error, teamsQuery.isError]);

	const teams = teamsQuery.data?.teams ?? [];

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

	const handleRemoveMember = useCallback(
		async (teamId: string, memberId: string) => {
			try {
				await updateMembers(teamId, [], [memberId]);
			} catch (e) {
				toast.error(formatUserFacingError(e, "Could not remove team member."));
			}
		},
		[updateMembers]
	);

	if (teamsQuery.isPending) {
		return (
			<div className="flex min-h-[240px] items-center justify-center py-8">
				<PageLoader mode="embedded" />
			</div>
		);
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
			{teams.map((entry) => {
				const teamId = teamRefId(entry);
				const key = entry.id || teamId || teamName(entry);
				const collapsed = collapsedById[key] === true;
				const members = (entry.members ?? []).filter((m) => userId(m.user));
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
											<th className="w-12 px-3 py-2.5">
												<input
													type="checkbox"
													disabled
													className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400 dark:border-black-500"
													aria-label={`Select all ${teamName(entry)} members`}
												/>
											</th>
											<th className="px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
												Name
											</th>
											<th className="px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
												Email
											</th>
											<th className="px-4 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
												Username
											</th>
											<th className="w-20 px-4 py-2.5 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">
												<span className="sr-only">Actions</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{members.length === 0 ? (
											<tr className="bg-white dark:bg-black-800">
												<td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
													No members added to this agreement team.
												</td>
											</tr>
										) : (
											members.map((member) => {
												const memberId = userId(member.user);
												return (
													<tr
														key={memberId}
														className="border-b border-neutral-100 bg-white hover:bg-neutral-50 dark:border-black-600 dark:bg-black-800 dark:hover:bg-black-700/50"
													>
														<td className="px-3 py-2.5">
															<input
																type="checkbox"
																disabled
																className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400 dark:border-black-500"
																aria-label={`Select ${userDisplayName(member.user)}`}
															/>
														</td>
														<td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-white">
															{userDisplayName(member.user)}
														</td>
														<td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
															{userEmail(member.user)}
														</td>
														<td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-300">
															{member.user?.username?.trim() || "—"}
														</td>
														<td className="px-4 py-2.5 text-right">
															<button
																type="button"
																disabled={!teamId || patchMembersMutation.isPending}
																className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 disabled:pointer-events-none disabled:opacity-50 dark:text-error-400 dark:hover:bg-error-950/30"
																onClick={() => void handleRemoveMember(teamId, memberId)}
															>
																<DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
																Remove
															</button>
														</td>
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

			<AddAgreementTeamMembersModal
				open={addMembersTarget !== null}
				team={addMembersTarget?.team ?? null}
				pending={patchMembersMutation.isPending}
				onClose={() => setAddMembersTarget(null)}
				onSave={handleSaveMembers}
			/>
		</div>
	);
}
