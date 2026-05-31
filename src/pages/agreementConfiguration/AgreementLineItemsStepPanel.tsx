import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import type { ColumnDef } from "@tanstack/react-table";
import { useDeleteAgreementLineItemMutation, type AgreementStepDetailsData, type AgreementLineItemsTableRow } from "../../api";
import { Button } from "../../components/base/Button";
import { ConfirmModal } from "../../components/base/ConfirmModal";
import { FloatingBar } from "../../components/base/FloatingBar";
import { InfiniteTable } from "../../components/base/InfiniteTable";
import { Skeleton } from "../../components/base/Skeleton";
import { SearchInput } from "../../components/form-input/SearchInput";
import { createStickyActionsColumn } from "../../components/modules/settings/stickyActionsColumn";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import {
	displayLineItemCell,
	filterLineItemTableRows,
	findFieldDefById,
	isSelectableLineItemRowId,
	resolveLineItemsTable,
} from "./agreementLineItemsUtils";
import type { AgreementLineItemsTableColumn } from "../../api";

const LINE_ITEM_FALLBACK_COLUMN_COUNT = 4;

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

	const showSelection = !readOnly;
	const showActions = !readOnly;
	const table = resolveLineItemsTable(details);
	const columns = table?.columns ?? [];
	const allRows = table?.rows ?? [];

	const filteredRows = useMemo(() => {
		if (!details || columns.length === 0) return allRows;
		return filterLineItemTableRows(allRows, columns, details, tableSearch);
	}, [allRows, columns, details, tableSearch]);

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

	const columnDefs = useMemo<ColumnDef<AgreementLineItemsTableRow, unknown>[]>(() => {
		const cols = columns.length > 0 ? columns : LOADING_PLACEHOLDER_COLUMNS;
		return cols.map((c) => ({
			id: c.fieldId,
			header: columns.length === 0
				? () => <Skeleton className="h-3 w-20" />
				: (c.label ?? c.fieldId).trim() || c.fieldId,
			size: c.width ?? 180,
			minSize: 80,
			enableResizing: true,
			cell: ({ row }: { row: { original: AgreementLineItemsTableRow } }) => {
				if (columns.length === 0) return null;
				const f = findFieldDefById(details, c.fieldId);
				const shown = displayLineItemCell(f, row.original.cells[c.fieldId]);
				return (
					<span className="block max-w-[220px] truncate" title={shown}>
						{shown}
					</span>
				);
			},
		}));
	}, [columns, details]);

	const actionsColumn = useMemo(
		() =>
			createStickyActionsColumn<AgreementLineItemsTableRow>(({ row }) => {
				if (!isSelectableLineItemRowId(row.original.id)) return null;
				const rowLabel = columns
					.map((c) =>
						displayLineItemCell(findFieldDefById(details, c.fieldId), row.original.cells[c.fieldId])
					)
					.filter((v) => v !== "—")
					.join(", ");
				return (
					<LineItemRowMenu
						rowLabel={rowLabel || undefined}
						onEdit={() => onRowClick(row.original.id)}
						onDeleteRequest={() => setDeletePendingIds([row.original.id])}
					/>
				);
			}),
		[columns, details, onRowClick]
	);

	const allColumns = useMemo(
		() => [...columnDefs, ...(showActions ? [actionsColumn] : [])],
		[columnDefs, showActions, actionsColumn]
	);

	const checkboxCfg = useMemo(
		() =>
			showSelection
				? {
						getRowId: (row: AgreementLineItemsTableRow) => row.id,
						checkedIds,
						setCheckedIds,
						isRowSelectable: (row: AgreementLineItemsTableRow) =>
							isSelectableLineItemRowId(row.id),
					}
				: undefined,
		[showSelection, checkedIds]
	);

	const hasLayout = Boolean(details?.sections?.length && columns.length > 0);
	const isInitialLoading = loading && !details;

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
			) : errorMessage ? (
				<p className="text-sm text-error-600 dark:text-error-400">{errorMessage}</p>
			) : (
				<InfiniteTable<AgreementLineItemsTableRow>
					data={filteredRows}
					columns={allColumns}
					height="calc(100vh - 380px)"
					hasMore={false}
					isInitialLoading={isInitialLoading}
					checkboxConfig={checkboxCfg}
					onRowClick={readOnly ? undefined : (row) => onRowClick(row.id)}
					emptyMessage={
						allRows.length === 0
							? "No line items yet. Use New Line Item to add one."
							: "No line items match your search."
					}
				/>
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
