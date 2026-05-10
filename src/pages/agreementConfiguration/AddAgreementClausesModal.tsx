import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { Button } from "../../components/base/Button";
import { Modal } from "../../components/base/Modal";
import { useClausesInfiniteList, usePatchAgreementClausesMutation, type ClauseListItem } from "../../api";
import { formatUserFacingError } from "../../lib/formatUserFacingError";

export interface AddAgreementClausesModalProps {
	open: boolean;
	onClose: () => void;
	agreementId: string;
	/** Clause ids already on the agreement — disabled in the list. */
	attachedClauseIds: ReadonlySet<string>;
	onAdded: () => void;
}

function clauseRowId(row: ClauseListItem): string {
	return (row._id ?? "").trim();
}

export function AddAgreementClausesModal({
	open,
	onClose,
	agreementId,
	attachedClauseIds,
	onAdded,
}: AddAgreementClausesModalProps) {
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

	const listQuery = useClausesInfiniteList({
		search: debouncedSearch || undefined,
		sort: "-createdAt",
		limit: 25,
	});
	const patchMutation = usePatchAgreementClausesMutation();

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
		return () => window.clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		if (!open) return;
		setSearchInput("");
		setDebouncedSearch("");
		setSelectedIds(new Set());
	}, [open]);

	const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const toggleRow = useCallback((id: string) => {
		if (attachedClauseIds.has(id)) return;
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, [attachedClauseIds]);

	const handleAdd = useCallback(async () => {
		const add = [...selectedIds];
		if (!add.length) {
			toast.info("Select at least one clause.");
			return;
		}
		try {
			await patchMutation.mutateAsync({ agreementId, body: { add } });
			toast.success(add.length === 1 ? "Clause added." : `${add.length} clauses added.`);
			onAdded();
			onClose();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not add clauses."));
		}
	}, [agreementId, onAdded, onClose, patchMutation, selectedIds]);

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const isInitialLoading = listQuery.isLoading && !listQuery.data;

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={920}
			maskClosable={!patchMutation.isPending}
			keyboard={!patchMutation.isPending}
			header={<h2 className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">Add clauses</h2>}
			footer={
				<div className="flex justify-end gap-3">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						onClick={onClose}
						disabled={patchMutation.isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="md"
						appearance="filled"
						status="primary"
						loading={patchMutation.isPending}
						disabled={selectedIds.size === 0}
						onClick={() => void handleAdd()}
					>
						Add to agreement
					</Button>
				</div>
			}
		>
			<div className="flex max-h-[min(520px,70vh)] flex-col gap-3">
				<div className="relative max-w-xl shrink-0">
					<SearchOutlinedIcon
						className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-neutral-400"
						sx={{ fontSize: 18 }}
					/>
					<input
						type="search"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						placeholder="Search clauses (display id, title, category…)"
						className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 dark:border-black-600 dark:bg-black-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-primary-500"
						autoComplete="off"
					/>
				</div>

				{listQuery.isError && (
					<p className="text-sm text-error-600 dark:text-error-400">
						{formatUserFacingError(listQuery.error, "Could not load clauses.")}
					</p>
				)}

				<div className="min-h-0 flex-1 overflow-auto rounded-lg border border-neutral-200 dark:border-black-600">
					{isInitialLoading ? (
						<div className="flex items-center justify-center py-16 text-sm text-neutral-500">Loading…</div>
					) : rows.length === 0 ? (
						<div className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
							No clauses match your search.
						</div>
					) : (
						<table className="w-full border-collapse text-left text-sm">
							<thead className="sticky top-0 z-[1] bg-neutral-50 dark:bg-black-800">
								<tr className="border-b border-neutral-200 dark:border-black-600">
									<th className="w-10 px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400" />
									<th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400">Display ID</th>
									<th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400">Title</th>
									<th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400">Category</th>
									<th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-400">Status</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => {
									const id = clauseRowId(row);
									const attached = attachedClauseIds.has(id);
									const checked = selectedIds.has(id);
									return (
										<tr
											key={id}
											className="border-b border-neutral-100 hover:bg-neutral-50 dark:border-black-600 dark:hover:bg-black-700/60"
										>
											<td className="px-3 py-2 align-middle">
												<input
													type="checkbox"
													className="infinite-table-checkbox"
													checked={checked}
													disabled={attached || !id}
													onChange={() => id && toggleRow(id)}
													aria-label={`Select clause ${row.displayId ?? id}`}
												/>
											</td>
											<td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
												{row.displayId?.trim() || id || "—"}
											</td>
											<td className="max-w-[240px] truncate px-3 py-2 text-neutral-700 dark:text-neutral-300" title={row.title}>
												{row.title?.trim() || "—"}
											</td>
											<td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
												{row.category?.trim() || "—"}
											</td>
											<td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
												{attached ? (
													<span className="text-xs text-neutral-500">Already added</span>
												) : row.isActive ? (
													<span className="rounded bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900 dark:text-success-300">
														Active
													</span>
												) : (
													<span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-black-600 dark:text-neutral-300">
														Inactive
													</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>

				{listQuery.hasNextPage ? (
					<div className="flex shrink-0 justify-center pb-1">
						<Button
							type="button"
							size="sm"
							appearance="outlined"
							status="secondary-neutral"
							loading={listQuery.isFetchingNextPage}
							onClick={() => void loadMore()}
						>
							Load more
						</Button>
					</div>
				) : null}
			</div>
		</Modal>
	);
}
