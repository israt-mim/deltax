import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { useDeleteAgreementLineItemMutation, type AgreementStepDetailsData } from "../../api";
import { Button } from "../../components/base/Button";
import { ConfirmModal } from "../../components/base/ConfirmModal";
import { FloatingBar } from "../../components/base/FloatingBar";
import { SearchInput } from "../../components/form-input/SearchInput";
import { Skeleton } from "../../components/base/Skeleton";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import {
	displayLineItemCell,
	filterLineItemTableRows,
	findFieldDefById,
	isSelectableLineItemRowId,
	resolveLineItemsTable,
} from "./agreementLineItemsUtils";
import type { AgreementLineItemsTableColumn } from "../../api";

const LINE_ITEM_TABLE_SKELETON_ROWS = 6;
const LINE_ITEM_FALLBACK_COLUMN_COUNT = 4;
const LINE_ITEM_TR_CLASS =
	"border-b border-neutral-100 bg-white dark:border-black-600 dark:bg-black-800";
const LINE_ITEM_TD_CLASS = "px-4 py-2.5 align-middle";

const LOADING_PLACEHOLDER_COLUMNS: AgreementLineItemsTableColumn[] = Array.from(
	{ length: LINE_ITEM_FALLBACK_COLUMN_COUNT },
	(_, i) => ({ fieldId: `placeholder-${i}`, label: undefined })
);

function LineItemRowMenu({
	rowLabel,
	onEdit,
	onDeleteRequest,
}: {
	rowLabel?: string;
	onEdit: () => void;
	onDeleteRequest: () => void;
}) {
	const items: MenuProps["items"] = [
		{
			key: "edit",
			icon: <EditOutlinedIcon sx={{ fontSize: 18 }} />,
			label: "Edit",
		},
		{
			key: "delete",
			icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: "inherit" }} />,
			label: "Delete",
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
						if (key === "edit") onEdit();
						if (key === "delete") onDeleteRequest();
					},
				}}
			>
				<button
					type="button"
					aria-label={rowLabel ? `Line item actions: ${rowLabel}` : "Line item actions"}
					className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
				>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</button>
			</Dropdown>
		</div>
	);
}

export interface AgreementLineItemsStepPanelProps {
	agreementId: string;
	details: AgreementStepDetailsData | null;
	loading: boolean;
	errorMessage: string | null;
	readOnly?: boolean;
	onRefresh: () => void;
	onNewClick: () => void;
	onRowClick: (rowId: string) => void;
}

export function AgreementLineItemsStepPanel({
	agreementId,
	details,
	loading,
	errorMessage,
	readOnly = false,
	onRefresh,
	onNewClick,
	onRowClick,
}: AgreementLineItemsStepPanelProps) {
	const deleteMutation = useDeleteAgreementLineItemMutation();
	const [tableSearch, setTableSearch] = useState("");
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [deletePendingIds, setDeletePendingIds] = useState<string[] | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const selectAllRef = useRef<HTMLInputElement>(null);

	const showSelection = !readOnly;
	const showActions = !readOnly;
	const table = resolveLineItemsTable(details);
	const columns = table?.columns ?? [];
	const allRows = table?.rows ?? [];

	const filteredRows = useMemo(() => {
		if (!details || columns.length === 0) return allRows;
		return filterLineItemTableRows(allRows, columns, details, tableSearch);
	}, [allRows, columns, details, tableSearch]);

	const filteredSelectableIds = useMemo(
		() => filteredRows.map((r) => r.id).filter(isSelectableLineItemRowId),
		[filteredRows]
	);

	const allFilteredSelected =
		filteredSelectableIds.length > 0 && filteredSelectableIds.every((id) => checkedIds.has(id));
	const someFilteredSelected = filteredSelectableIds.some((id) => checkedIds.has(id));

	useEffect(() => {
		const el = selectAllRef.current;
		if (!el) return;
		el.indeterminate = someFilteredSelected && !allFilteredSelected;
	}, [someFilteredSelected, allFilteredSelected]);

	useEffect(() => {
		const valid = new Set(allRows.map((r) => r.id).filter(isSelectableLineItemRowId));
		setCheckedIds((prev) => {
			const next = new Set<string>();
			for (const id of prev) {
				if (valid.has(id)) next.add(id);
			}
			return next.size === prev.size && [...prev].every((id) => next.has(id)) ? prev : next;
		});
	}, [allRows]);

	const toggleSelectAllFiltered = useCallback(() => {
		setCheckedIds((prev) => {
			if (allFilteredSelected) {
				const next = new Set(prev);
				for (const id of filteredSelectableIds) next.delete(id);
				return next;
			}
			const next = new Set(prev);
			for (const id of filteredSelectableIds) next.add(id);
			return next;
		});
	}, [allFilteredSelected, filteredSelectableIds]);

	const clearSelection = useCallback(() => {
		setCheckedIds(new Set());
	}, []);

	const handleDeleteConfirm = useCallback(async () => {
		if (!deletePendingIds?.length) return;
		setIsDeleting(true);
		try {
			const results = await Promise.allSettled(
				deletePendingIds.map((lineItemId) =>
					deleteMutation.mutateAsync({ agreementId, lineItemId })
				)
			);
			const failed = results.filter((r) => r.status === "rejected").length;
			const succeeded = deletePendingIds.length - failed;
			if (succeeded > 0) {
				toast.success(
					succeeded === 1
						? "Line item deleted."
						: `${succeeded} line item${succeeded === 1 ? "" : "s"} deleted.`
				);
			}
			if (failed > 0) {
				toast.error(
					failed === deletePendingIds.length
						? "Could not delete line item(s)."
						: `${failed} line item${failed === 1 ? "" : "s"} could not be deleted.`
				);
			}
			setDeletePendingIds(null);
			setCheckedIds((prev) => {
				const next = new Set(prev);
				for (const id of deletePendingIds) next.delete(id);
				return next;
			});
			if (succeeded > 0) onRefresh();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete line item(s)."));
		} finally {
			setIsDeleting(false);
		}
	}, [agreementId, deleteMutation, deletePendingIds, onRefresh]);

	const hasLayout = Boolean(details?.sections?.length && columns.length > 0);
	const extraCols = (showSelection ? 1 : 0) + (showActions ? 1 : 0);
	const showNoSearchResults = !loading && !errorMessage && allRows.length > 0 && filteredRows.length === 0;
	const headerColumns = columns.length > 0 ? columns : LOADING_PLACEHOLDER_COLUMNS;
	const headerColCount = headerColumns.length + extraCols;
	const usePlaceholderHeaders = loading && columns.length === 0;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<SearchInput
					placeholder="Search line items…"
					aria-label="Search line items"
					value={tableSearch}
					onChange={(e) => setTableSearch(e.target.value)}
					className="min-w-[200px] max-w-md flex-1"
				/>
				{readOnly ? null : (
					<Button type="button" size="md" status="primary" onClick={onNewClick}>
						<AddOutlinedIcon sx={{ fontSize: 16 }} />
						New Line Item
					</Button>
				)}
			</div>

			<FloatingBar
				open={showSelection && !loading && checkedIds.size > 0}
				selectedCount={checkedIds.size}
				onClearSelection={clearSelection}
				onDelete={() => {
					const ids = [...checkedIds];
					if (!ids.length) return;
					setDeletePendingIds(ids);
				}}
				deletePending={isDeleting}
			/>

			{!loading && !errorMessage && !hasLayout ? (
				<p className="text-sm text-neutral-500 dark:text-neutral-400">
					No line item fields are configured for this agreement. Update the agreement configuration to add
					columns here.
				</p>
			) : (
				<div className="overflow-auto rounded-lg border border-neutral-200 dark:border-black-600">
					<table className="w-full min-w-[640px] border-collapse text-left text-sm">
						<thead className="bg-neutral-50 dark:bg-black-800">
							<tr className="border-b border-neutral-200 dark:border-black-600">
								{showSelection ? (
									<th className="w-12 px-3 py-2.5">
										{!loading && filteredSelectableIds.length > 0 ? (
											<input
												ref={selectAllRef}
												type="checkbox"
												checked={allFilteredSelected}
												onChange={() => toggleSelectAllFiltered()}
												className="theme-checkbox"
												aria-label="Select all line items in this list"
											/>
										) : null}
									</th>
								) : null}
								{headerColumns.map((c) => (
									<th
										key={c.fieldId}
										className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
									>
										{usePlaceholderHeaders ? (
											<Skeleton className="h-3 w-20" />
										) : (
											(c.label ?? c.fieldId).trim() || c.fieldId
										)}
									</th>
								))}
								{showActions ? (
									<th className="w-12 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
										<span className="sr-only">Actions</span>
									</th>
								) : null}
							</tr>
						</thead>
						<tbody>
							{loading ? (
								Array.from({ length: LINE_ITEM_TABLE_SKELETON_ROWS }).map((_, ri) => (
									<tr key={`sk-${ri}`} className={LINE_ITEM_TR_CLASS} aria-hidden>
										{showSelection ? (
											<td className="px-3 py-2.5">
												<Skeleton className="h-4 w-4" />
											</td>
										) : null}
										{headerColumns.map((c) => (
											<td key={c.fieldId} className={LINE_ITEM_TD_CLASS}>
												<Skeleton className="h-4 w-[85%] max-w-[160px]" />
											</td>
										))}
										{showActions ? (
											<td className="px-3 py-2.5">
												<Skeleton className="ml-auto h-4 w-4" />
											</td>
										) : null}
									</tr>
								))
							) : errorMessage ? (
								<tr className={LINE_ITEM_TR_CLASS}>
									<td
										colSpan={headerColCount}
										className="px-4 py-14 text-center text-sm text-error-600 dark:text-error-400"
									>
										{errorMessage}
									</td>
								</tr>
							) : allRows.length === 0 ? (
								<tr className={LINE_ITEM_TR_CLASS}>
									<td
										colSpan={headerColCount}
										className="px-4 py-14 text-center text-sm text-neutral-500 dark:text-neutral-400"
									>
										No line items yet. Use New Line Item to add one.
									</td>
								</tr>
							) : showNoSearchResults ? (
								<tr className={LINE_ITEM_TR_CLASS}>
									<td
										colSpan={headerColCount}
										className="px-4 py-14 text-center text-sm text-neutral-500 dark:text-neutral-400"
									>
										No line items match your search.
									</td>
								</tr>
							) : (
								filteredRows.map((row) => {
								const selectable = isSelectableLineItemRowId(row.id);
								const rowLabel = columns
									.map((c) =>
										displayLineItemCell(
											findFieldDefById(details, c.fieldId),
											row.cells[c.fieldId]
										)
									)
									.filter((v) => v !== "—")
									.join(", ");
								return (
									<tr
										key={row.id}
										role={readOnly ? undefined : "button"}
										tabIndex={readOnly ? undefined : 0}
										className={
											readOnly
												? "border-b border-neutral-100 bg-white dark:border-black-600 dark:bg-black-800"
												: "cursor-pointer border-b border-neutral-100 bg-white hover:bg-neutral-50 dark:border-black-600 dark:bg-black-800 dark:hover:bg-black-700/50"
										}
										onClick={readOnly ? undefined : () => onRowClick(row.id)}
										onKeyDown={
											readOnly
												? undefined
												: (e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															onRowClick(row.id);
														}
													}
										}
									>
										{showSelection ? (
											<td
												className="px-3 py-2.5 align-middle"
												onClick={(e) => e.stopPropagation()}
												onKeyDown={(e) => e.stopPropagation()}
											>
												{selectable ? (
													<input
														type="checkbox"
														checked={checkedIds.has(row.id)}
														onChange={() => {
															setCheckedIds((prev) => {
																const next = new Set(prev);
																if (next.has(row.id)) next.delete(row.id);
																else next.add(row.id);
																return next;
															});
														}}
														className="theme-checkbox"
														aria-label={`Select line item${rowLabel ? `: ${rowLabel}` : ""}`}
													/>
												) : (
													<span className="inline-block w-4" aria-hidden />
												)}
											</td>
										) : null}
										{columns.map((c) => {
											const f = findFieldDefById(details, c.fieldId);
											const cellVal = row.cells[c.fieldId];
											const shown = displayLineItemCell(f, cellVal);
											return (
												<td
													key={c.fieldId}
													className="max-w-[220px] truncate px-4 py-2.5 text-neutral-800 dark:text-neutral-200"
													title={shown}
												>
													{shown}
												</td>
											);
										})}
										{showActions ? (
											<td
												className="px-3 py-2.5 align-middle"
												onClick={(e) => e.stopPropagation()}
												onKeyDown={(e) => e.stopPropagation()}
											>
												{selectable ? (
													<LineItemRowMenu
														rowLabel={rowLabel || undefined}
														onEdit={() => onRowClick(row.id)}
														onDeleteRequest={() => setDeletePendingIds([row.id])}
													/>
												) : null}
											</td>
										) : null}
									</tr>
								);
							})
						)}
						</tbody>
					</table>
				</div>
			)}

			<ConfirmModal
				open={deletePendingIds !== null}
				onClose={() => {
					if (!isDeleting) setDeletePendingIds(null);
				}}
				title={
					deletePendingIds?.length === 1
						? "Delete this line item?"
						: `Delete ${deletePendingIds?.length ?? 0} line items?`
				}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={isDeleting}
				onConfirm={() => void handleDeleteConfirm()}
			>
				<p className="mb-0 text-neutral-700 dark:text-neutral-300">
					{deletePendingIds?.length === 1
						? "This line item will be permanently removed from this agreement."
						: "The selected line items will be permanently removed from this agreement."}
				</p>
			</ConfirmModal>
		</div>
	);
}
