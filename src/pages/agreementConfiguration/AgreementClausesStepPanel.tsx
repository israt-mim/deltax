import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
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
import { InfiniteTable } from "../../components/base/InfiniteTable";
import type { StickyColumnMeta } from "../../hooks/useColumns";
import {
	useAgreementAttachedClauseIdsQuery,
	useAgreementClausesInfiniteList,
	usePatchAgreementClausesMutation,
	type AgreementClauseBrief,
} from "../../api";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { AddAgreementClausesModal } from "./AddAgreementClausesModal";
import { ClauseDetailModal } from "./ClauseDetailModal";

export interface AgreementClausesStepPanelProps {
	agreementId: string;
	readOnly?: boolean;
}

function briefId(c: AgreementClauseBrief): string {
	return (c.id ?? "").trim();
}

const actionsStickyMeta: StickyColumnMeta = {
	isSticky: true,
	stickyRight: 0,
	isFirstSticky: true,
	sortable: false,
};

function ClauseRowMenu({
	clause,
	readOnly,
	onRemoveRequest,
}: {
	clause: AgreementClauseBrief;
	readOnly?: boolean;
	onRemoveRequest: (c: AgreementClauseBrief) => void;
}) {
	if (readOnly) return null;
	const items: MenuProps["items"] = [
		{
			key: "remove",
			icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
			label: "Remove",
			danger: true,
		},
	];
	return (
		<div data-row-click-ignore className="flex justify-end">
			<Dropdown
				menu={{
					items,
					onClick: ({ key }) => {
						if (key === "remove") onRemoveRequest(clause);
					},
				}}
				trigger={["click"]}
			>
				<button
					type="button"
					className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-black-700"
					aria-label="Clause actions"
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

function clauseStatusCell(c: AgreementClauseBrief) {
	if (c.isActive === true) {
		return (
			<span className="rounded bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900 dark:text-success-300">
				Active
			</span>
		);
	}
	if (c.isActive === false) {
		return (
			<span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-black-600 dark:text-neutral-300">
				Inactive
			</span>
		);
	}
	return <span className="text-neutral-400">—</span>;
}

export function AgreementClausesStepPanel({ agreementId, readOnly = false }: AgreementClausesStepPanelProps) {
	const patchMutation = usePatchAgreementClausesMutation();
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [removePending, setRemovePending] = useState<RemovePending>(null);
	const [viewClauseId, setViewClauseId] = useState<string | null>(null);
	const [viewClauseBrief, setViewClauseBrief] = useState<AgreementClauseBrief | null>(null);

	const showSelection = !readOnly;
	const showActions = !readOnly;

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
		return () => window.clearTimeout(t);
	}, [searchInput]);

	const listQuery = useAgreementClausesInfiniteList({
		agreementId,
		search: debouncedSearch || undefined,
		sort: "-createdAt",
		limit: 25,
	});

	const attachedIdsQuery = useAgreementAttachedClauseIdsQuery({ agreementId });

	const rows = useMemo(
		() => listQuery.data?.pages.flatMap((p) => p.data) ?? [],
		[listQuery.data?.pages]
	);

	const errorMessage = useMemo(() => {
		if (!listQuery.isError || !listQuery.error) return null;
		return formatUserFacingError(listQuery.error, "Could not load agreement clauses.");
	}, [listQuery.error, listQuery.isError]);

	const openClauseDetail = useCallback((clause: AgreementClauseBrief) => {
		const id = briefId(clause);
		if (!id) return;
		setViewClauseBrief(clause);
		setViewClauseId(id);
	}, []);

	const closeClauseDetail = useCallback(() => {
		setViewClauseId(null);
		setViewClauseBrief(null);
	}, []);

	const attachedIds = attachedIdsQuery.data ?? new Set<string>();

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const refreshClauses = useCallback(() => {
		void listQuery.refetch();
		void attachedIdsQuery.refetch();
	}, [attachedIdsQuery, listQuery]);

	useEffect(() => {
		const valid = attachedIds;
		setCheckedIds((prev) => {
			const next = new Set<string>();
			for (const id of prev) {
				if (valid.has(id)) next.add(id);
			}
			return next.size === prev.size && [...prev].every((id) => next.has(id)) ? prev : next;
		});
	}, [attachedIds]);

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
			refreshClauses();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not remove clause(s)."));
		}
	}, [agreementId, patchMutation, refreshClauses, removePending]);

	const columns = useMemo((): ColumnDef<AgreementClauseBrief, unknown>[] => {
		const cols: ColumnDef<AgreementClauseBrief, unknown>[] = [
			{
				id: "displayId",
				accessorFn: (c) => c.displayId?.trim() || briefId(c),
				header: "Display ID",
				size: 140,
				minSize: 100,
				cell: ({ row }) => (
					<span className="font-medium text-neutral-900 dark:text-white">
						{row.original.displayId?.trim() || briefId(row.original) || "—"}
					</span>
				),
			},
			{
				id: "title",
				accessorFn: (c) => c.title,
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
				accessorFn: (c) => c.category,
				header: "Category",
				size: 140,
				minSize: 100,
				cell: ({ row }) => row.original.category?.trim() || "—",
			},
			{
				id: "language",
				accessorFn: (c) => c.language,
				header: "Language",
				size: 120,
				minSize: 88,
				cell: ({ row }) => row.original.language?.trim() || "—",
			},
			{
				id: "status",
				accessorFn: (c) => c.isActive,
				header: "Status",
				size: 108,
				minSize: 88,
				enableResizing: false,
				cell: ({ row }) => clauseStatusCell(row.original),
			},
		];

		if (showActions) {
			cols.push({
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				size: 52,
				minSize: 52,
				maxSize: 52,
				enableResizing: false,
				meta: actionsStickyMeta,
				cell: ({ row }) => {
					const id = briefId(row.original);
					if (!id) return null;
					return (
						<ClauseRowMenu
							clause={row.original}
							readOnly={readOnly}
							onRemoveRequest={(clause) => setRemovePending({ mode: "single", clause })}
						/>
					);
				},
			});
		}

		return cols;
	}, [readOnly, showActions]);

	const emptyMessage = useMemo(() => {
		if (errorMessage) return errorMessage;
		if (debouncedSearch.trim()) return "No attached clauses match your search.";
		if (readOnly) return "No clauses on this agreement yet.";
		return "No clauses on this agreement yet. Use Add to pick clauses from the library.";
	}, [debouncedSearch, errorMessage, readOnly]);

	const showInitialLoading = listQuery.isPending && rows.length === 0 && !errorMessage;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<SearchInput
					placeholder="Search attached clauses…"
					aria-label="Search attached clauses"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="min-w-[200px] max-w-md flex-1"
				/>
				{readOnly ? null : (
					<Button type="button" size="md" status="primary" onClick={() => setAddModalOpen(true)}>
						<AddOutlinedIcon sx={{ fontSize: 16 }} />
						Add
					</Button>
				)}
			</div>

			<FloatingBar
				open={!showInitialLoading && !readOnly && checkedIds.size > 0}
				selectedCount={checkedIds.size}
				onClearSelection={clearSelection}
				deleteLabel="Remove"
				deletePending={patchMutation.isPending}
				onDelete={() => {
					const ids = [...checkedIds];
					if (!ids.length) return;
					setRemovePending({ mode: "bulk", ids });
				}}
			/>

			<InfiniteTable
				data={errorMessage ? [] : rows}
				columns={columns}
				onLoadMore={loadMore}
				isLoading={listQuery.isFetchingNextPage}
				isInitialLoading={showInitialLoading}
				hasMore={Boolean(listQuery.hasNextPage)}
				skeletonRowCount={8}
				emptyMessage={emptyMessage}
				onRowClick={(row) => openClauseDetail(row)}
				checkboxConfig={
					showSelection
						? {
								getRowId: briefId,
								checkedIds,
								setCheckedIds: setCheckedIds,
							}
						: undefined
				}
			/>

			<AddAgreementClausesModal
				open={addModalOpen}
				onClose={() => setAddModalOpen(false)}
				agreementId={agreementId}
				attachedClauseIds={attachedIds}
				onAdded={refreshClauses}
			/>

			<ClauseDetailModal
				open={viewClauseId !== null}
				clauseId={viewClauseId}
				clauseBrief={viewClauseBrief}
				onClose={closeClauseDetail}
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
