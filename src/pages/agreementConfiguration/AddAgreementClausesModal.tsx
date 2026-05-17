import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { SearchInput } from "../../components/form-input/SearchInput";
import { Button } from "../../components/base/Button";
import { InfiniteTable } from "../../components/base/InfiniteTable";
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

function ClausePickerSelectAllHeader({
	rows,
	attachedClauseIds,
	selectedIds,
	setSelectedIds,
}: {
	rows: ClauseListItem[];
	attachedClauseIds: ReadonlySet<string>;
	selectedIds: Set<string>;
	setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const selectableIds = useMemo(
		() => rows.map(clauseRowId).filter((id) => id && !attachedClauseIds.has(id)),
		[rows, attachedClauseIds]
	);
	const allChecked = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
	const someChecked = selectableIds.some((id) => selectedIds.has(id));
	const indeterminate = someChecked && !allChecked;

	useEffect(() => {
		if (inputRef.current) inputRef.current.indeterminate = indeterminate;
	}, [indeterminate]);

	return (
		<div className="flex w-full items-center justify-center">
			<input
				ref={inputRef}
				type="checkbox"
				className="infinite-table-checkbox"
				checked={allChecked}
				disabled={selectableIds.length === 0}
				onChange={() => {
					setSelectedIds((prev) => {
						const next = new Set(prev);
						if (allChecked) {
							for (const id of selectableIds) next.delete(id);
						} else {
							for (const id of selectableIds) next.add(id);
						}
						return next;
					});
				}}
				aria-label="Select all clauses"
			/>
		</div>
	);
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

	const toggleRow = useCallback(
		(id: string) => {
			if (attachedClauseIds.has(id)) return;
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			});
		},
		[attachedClauseIds]
	);

	const columns = useMemo((): ColumnDef<ClauseListItem, unknown>[] => {
		return [
			{
				id: "_checkbox",
				size: 44,
				minSize: 44,
				maxSize: 44,
				enableResizing: false,
				header: () => (
					<ClausePickerSelectAllHeader
						rows={rows}
						attachedClauseIds={attachedClauseIds}
						selectedIds={selectedIds}
						setSelectedIds={setSelectedIds}
					/>
				),
				cell: ({ row }) => {
					const id = clauseRowId(row.original);
					const attached = Boolean(id && attachedClauseIds.has(id));
					const checked = Boolean(id && selectedIds.has(id));
					return (
						<div data-row-click-ignore className="flex w-full items-center justify-center">
							<input
								type="checkbox"
								className="infinite-table-checkbox"
								checked={checked}
								disabled={attached || !id}
								onChange={() => id && toggleRow(id)}
								aria-label={`Select clause ${row.original.displayId ?? id}`}
							/>
						</div>
					);
				},
			},
			{
				id: "displayId",
				accessorFn: (row) => row.displayId,
				header: "Display ID",
				size: 140,
				minSize: 100,
				cell: ({ row }) => row.original.displayId?.trim() || clauseRowId(row.original) || "—",
			},
			{
				id: "title",
				accessorFn: (row) => row.title,
				header: "Title",
				size: 240,
				minSize: 140,
				cell: ({ row }) => (
					<span className="block max-w-[240px] truncate" title={row.original.title}>
						{row.original.title?.trim() || "—"}
					</span>
				),
			},
			{
				id: "category",
				accessorFn: (row) => row.category,
				header: "Category",
				size: 140,
				minSize: 100,
				cell: ({ row }) => row.original.category?.trim() || "—",
			},
			{
				id: "status",
				header: "Status",
				size: 120,
				minSize: 100,
				enableResizing: false,
				cell: ({ row }) => {
					const id = clauseRowId(row.original);
					const attached = Boolean(id && attachedClauseIds.has(id));
					if (attached) {
						return <span className="text-xs text-neutral-500 dark:text-neutral-400">Already added</span>;
					}
					if (row.original.isActive) {
						return (
							<span className="rounded bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900 dark:text-success-300">
								Active
							</span>
						);
					}
					return (
						<span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-black-600 dark:text-neutral-300">
							Inactive
						</span>
					);
				},
			},
		];
	}, [attachedClauseIds, rows, selectedIds, toggleRow]);

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

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
			<div className="flex flex-col gap-3">
				<SearchInput
					placeholder="Search clauses (display ID, title, category)…"
					aria-label="Search clauses"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="max-w-xl"
				/>

				{listQuery.isError ? (
					<p className="text-sm text-error-600 dark:text-error-400">
						{formatUserFacingError(listQuery.error, "Could not load clauses.")}
					</p>
				) : null}

				<InfiniteTable
					data={rows}
					columns={columns}
					height={420}
					rowHeight={44}
					onLoadMore={loadMore}
					isLoading={listQuery.isFetchingNextPage}
					isInitialLoading={listQuery.isLoading && !listQuery.data}
					hasMore={Boolean(listQuery.hasNextPage)}
					skeletonRowCount={10}
					emptyMessage="No clauses match your search."
				/>
			</div>
		</Modal>
	);
}
