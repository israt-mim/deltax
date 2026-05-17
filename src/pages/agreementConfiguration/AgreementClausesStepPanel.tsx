import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { toast } from "react-toastify";
import { SearchInput } from "../../components/form-input/SearchInput";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { Button } from "../../components/base/Button";
import { ConfirmModal } from "../../components/base/ConfirmModal";
import { FloatingBar } from "../../components/base/FloatingBar";
import { PageLoader } from "../../components/base/PageLoader";
import { Typography } from "../../components/base/Typography";
import { usePatchAgreementClausesMutation, type AgreementClauseBrief } from "../../api";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { AddAgreementClausesModal } from "./AddAgreementClausesModal";

export interface AgreementClausesStepPanelProps {
	agreementId: string;
	clauses: AgreementClauseBrief[] | undefined;
	loading: boolean;
	errorMessage: string | null;
	onRefresh: () => void;
}

function briefId(c: AgreementClauseBrief): string {
	return (c.id ?? "").trim();
}

function ClauseRowMenu({
	clause,
	onRemoveRequest,
}: {
	clause: AgreementClauseBrief;
	onRemoveRequest: (c: AgreementClauseBrief) => void;
}) {
	const items: MenuProps["items"] = [
		{
			key: "remove",
			icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
			label: "Remove",
			danger: true,
		},
	];

	return (
		<div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
			<Dropdown
				trigger={["click"]}
				classNames={{ root: "actions-dropdown-icon" }}
				menu={{
					items,
					onClick: ({ key, domEvent }) => {
						domEvent.preventDefault();
						domEvent.stopPropagation();
						if (key === "remove") onRemoveRequest(clause);
					},
				}}
			>
				<button
					type="button"
					aria-label="Clause actions"
					className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
				>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</button>
			</Dropdown>
		</div>
	);
}

type RemovePending =
	| { mode: "single"; clause: AgreementClauseBrief }
	| { mode: "bulk"; ids: string[] }
	| null;

export function AgreementClausesStepPanel({
	agreementId,
	clauses,
	loading,
	errorMessage,
	onRefresh,
}: AgreementClausesStepPanelProps) {
	const patchMutation = usePatchAgreementClausesMutation();
	const [tableSearch, setTableSearch] = useState("");
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [removePending, setRemovePending] = useState<RemovePending>(null);
	const selectAllRef = useRef<HTMLInputElement>(null);

	const attachedIds = useMemo(() => {
		const s = new Set<string>();
		for (const c of clauses ?? []) {
			const id = briefId(c);
			if (id) s.add(id);
		}
		return s;
	}, [clauses]);

	const filteredClauses = useMemo(() => {
		const list = clauses ?? [];
		const q = tableSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter((c) => {
			const hay = [c.displayId, c.title, c.category, briefId(c)].filter(Boolean).join(" ").toLowerCase();
			return hay.includes(q);
		});
	}, [clauses, tableSearch]);

	const filteredRowIds = useMemo(
		() => filteredClauses.map((c) => briefId(c)).filter(Boolean),
		[filteredClauses]
	);
	const allFilteredSelected =
		filteredRowIds.length > 0 && filteredRowIds.every((id) => checkedIds.has(id));
	const someFilteredSelected = filteredRowIds.some((id) => checkedIds.has(id));

	useEffect(() => {
		const el = selectAllRef.current;
		if (!el) return;
		el.indeterminate = someFilteredSelected && !allFilteredSelected;
	}, [someFilteredSelected, allFilteredSelected]);

	useEffect(() => {
		const valid = new Set(
			(clauses ?? [])
				.map((c) => briefId(c))
				.filter(Boolean)
		);
		setCheckedIds((prev) => {
			const next = new Set<string>();
			for (const id of prev) {
				if (valid.has(id)) next.add(id);
			}
			return next.size === prev.size && [...prev].every((id) => next.has(id)) ? prev : next;
		});
	}, [clauses]);

	const toggleSelectAllFiltered = useCallback(() => {
		setCheckedIds((prev) => {
			if (allFilteredSelected) {
				const next = new Set(prev);
				for (const id of filteredRowIds) next.delete(id);
				return next;
			}
			const next = new Set(prev);
			for (const id of filteredRowIds) next.add(id);
			return next;
		});
	}, [allFilteredSelected, filteredRowIds]);

	const clearSelection = useCallback(() => {
		setCheckedIds(new Set());
	}, []);

	const handleRemoveConfirm = useCallback(async () => {
		if (!removePending) return;
		const ids =
			removePending.mode === "single"
				? [briefId(removePending.clause)].filter(Boolean)
				: removePending.ids.filter(Boolean);
		if (!ids.length) return;
		try {
			await patchMutation.mutateAsync({ agreementId, body: { remove: ids } });
			toast.success(
				ids.length === 1
					? "Clause removed from this agreement."
					: `${ids.length} clauses removed from this agreement.`
			);
			setRemovePending(null);
			setCheckedIds((prev) => {
				const next = new Set(prev);
				for (const id of ids) next.delete(id);
				return next;
			});
			onRefresh();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not remove clause(s)."));
		}
	}, [agreementId, onRefresh, patchMutation, removePending]);

	if (loading) {
		return (
			<div className="flex min-h-[200px] items-center justify-center py-8">
				<PageLoader mode="embedded" />
			</div>
		);
	}

	if (errorMessage) {
		return (
			<Typography size="small" className="text-error-600 dark:text-error-400">
				{errorMessage}
			</Typography>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<SearchInput
					placeholder="Search attached clauses…"
					aria-label="Search attached clauses"
					value={tableSearch}
					onChange={(e) => setTableSearch(e.target.value)}
					className="min-w-[200px] max-w-md flex-1"
				/>
				<Button type="button" size="md" status="primary" onClick={() => setAddModalOpen(true)}>
					<AddOutlinedIcon sx={{ fontSize: 16 }} />
					Add
				</Button>
			</div>

			<FloatingBar
				open={checkedIds.size > 0}
				selectedCount={checkedIds.size}
				onClearSelection={clearSelection}
				items={
					<button
						type="button"
						onClick={() => {
							const ids = [...checkedIds];
							if (!ids.length) return;
							setRemovePending({ mode: "bulk", ids });
						}}
						className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-red-200 transition-colors hover:bg-white/10 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
					>
						<DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
						Remove
					</button>
				}
			/>

			<div className="overflow-auto rounded-lg border border-neutral-200 dark:border-black-600">
				<table className="w-full min-w-[680px] border-collapse text-left text-sm">
					<thead className="bg-neutral-50 dark:bg-black-800">
						<tr className="border-b border-neutral-200 dark:border-black-600">
							<th className="w-12 px-3 py-2.5">
								{filteredRowIds.length > 0 ? (
									<input
										ref={selectAllRef}
										type="checkbox"
										checked={allFilteredSelected}
										onChange={() => toggleSelectAllFiltered()}
										className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400 dark:border-black-500"
										aria-label="Select all clauses in this list"
									/>
								) : null}
							</th>
							<th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
								Display ID
							</th>
							<th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
								Title
							</th>
							<th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
								Category
							</th>
							<th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
								Language
							</th>
							<th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
								Status
							</th>
							<th className="w-12 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{filteredClauses.length === 0 ? (
							<tr className="border-b border-neutral-100 bg-white dark:border-black-600 dark:bg-black-800">
								<td
									colSpan={7}
									className="px-4 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400"
								>
									{tableSearch.trim()
										? "No attached clauses match your search."
										: "No clauses on this agreement yet. Use Add to pick clauses from the library."}
								</td>
							</tr>
						) : (
							filteredClauses.map((c) => {
								const id = briefId(c);
								return (
									<tr
										key={id || c.displayId}
										className="border-b border-neutral-100 bg-white hover:bg-neutral-50 dark:border-black-600 dark:bg-black-800 dark:hover:bg-black-700/50"
									>
										<td className="px-3 py-2.5 align-middle">
											{id ? (
												<input
													type="checkbox"
													checked={checkedIds.has(id)}
													onChange={() => {
														setCheckedIds((prev) => {
															const next = new Set(prev);
															if (next.has(id)) next.delete(id);
															else next.add(id);
															return next;
														});
													}}
													className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400 dark:border-black-500"
													aria-label={`Select clause ${c.displayId?.trim() || c.title?.trim() || id}`}
												/>
											) : (
												<span className="inline-block w-4" aria-hidden />
											)}
										</td>
										<td className="whitespace-nowrap px-4 py-2.5 font-medium text-neutral-900 dark:text-white">
											{c.displayId?.trim() || id || "—"}
										</td>
										<td className="max-w-xs truncate px-4 py-2.5 text-neutral-700 dark:text-neutral-300" title={c.title}>
											{c.title?.trim() || "—"}
										</td>
										<td className="whitespace-nowrap px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
											{c.category?.trim() || "—"}
										</td>
										<td className="whitespace-nowrap px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
											{c.language?.trim() || "—"}
										</td>
										<td className="px-4 py-2.5">
											{c.isActive === true ? (
												<span className="rounded bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900 dark:text-success-300">
													Active
												</span>
											) : c.isActive === false ? (
												<span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-black-600 dark:text-neutral-300">
													Inactive
												</span>
											) : (
												<span className="text-neutral-400">—</span>
											)}
										</td>
										<td className="px-3 py-2.5 align-middle">
											{id ? (
												<ClauseRowMenu clause={c} onRemoveRequest={(row) => setRemovePending({ mode: "single", clause: row })} />
											) : null}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<AddAgreementClausesModal
				open={addModalOpen}
				onClose={() => setAddModalOpen(false)}
				agreementId={agreementId}
				attachedClauseIds={attachedIds}
				onAdded={onRefresh}
			/>

			<ConfirmModal
				open={removePending !== null}
				onClose={() => setRemovePending(null)}
				title={
					removePending?.mode === "bulk"
						? `Remove ${removePending.ids.length} clause${removePending.ids.length === 1 ? "" : "s"}?`
						: "Remove this clause?"
				}
				confirmLabel="Remove"
				cancelLabel="Cancel"
				confirmDanger
				pending={patchMutation.isPending}
				onConfirm={() => void handleRemoveConfirm()}
			>
				{removePending?.mode === "bulk" ? (
					<p className="mb-0 text-neutral-700 dark:text-neutral-300">
						{removePending.ids.length} selected clause{removePending.ids.length === 1 ? "" : "s"} will be
						detached from this agreement. Library entries are not deleted.
					</p>
				) : (
					<p className="mb-0 text-neutral-700 dark:text-neutral-300">
						<span className="font-medium text-neutral-900 dark:text-white">
							{removePending?.mode === "single"
								? removePending.clause.title?.trim() ||
									removePending.clause.displayId ||
									"This clause"
								: "This clause"}
						</span>{" "}
						will be detached from this agreement. The clause library entry is not deleted.
					</p>
				)}
			</ConfirmModal>
		</div>
	);
}
