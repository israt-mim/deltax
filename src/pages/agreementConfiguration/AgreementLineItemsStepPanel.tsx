import { useMemo, useState, type ReactNode } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import type { AgreementStepDetailsData } from "../../api";
import { Button } from "../../components/base/Button";
import { SearchInput } from "../../components/form-input/SearchInput";
import { AgreementTableSkeleton } from "../../components/skeletons";
import { Typography } from "../../components/base/Typography";
import {
	displayLineItemCell,
	filterLineItemTableRows,
	findFieldDefById,
	resolveLineItemsTable,
} from "./agreementLineItemsUtils";

export interface AgreementLineItemsStepPanelProps {
	details: AgreementStepDetailsData | null;
	loading: boolean;
	errorMessage: string | null;
	readOnly?: boolean;
	onNewClick: () => void;
	onRowClick: (rowId: string) => void;
}

export function AgreementLineItemsStepPanel({
	details,
	loading,
	errorMessage,
	readOnly = false,
	onNewClick,
	onRowClick,
}: AgreementLineItemsStepPanelProps) {
	const [tableSearch, setTableSearch] = useState("");
	const table = resolveLineItemsTable(details);
	const columns = table?.columns ?? [];
	const allRows = table?.rows ?? [];

	const filteredRows = useMemo(() => {
		if (!details || columns.length === 0) return allRows;
		return filterLineItemTableRows(allRows, columns, details, tableSearch);
	}, [allRows, columns, details, tableSearch]);

	const hasLayout = Boolean(details?.sections?.length && columns.length > 0);
	const colCount = Math.max(columns.length, 1);
	const showNoSearchResults = !loading && allRows.length > 0 && filteredRows.length === 0;

	let tableContent: ReactNode;
	if (loading) {
		tableContent = (
			<AgreementTableSkeleton columns={columns.length > 0 ? columns.length : 4} showToolbar={false} />
		);
	} else if (errorMessage) {
		tableContent = (
			<Typography size="small" className="text-error-600 dark:text-error-400">
				{errorMessage}
			</Typography>
		);
	} else if (!hasLayout) {
		tableContent = (
			<p className="text-sm text-neutral-500 dark:text-neutral-400">
				No line item fields are configured for this agreement. Update the agreement configuration to add columns
				here.
			</p>
		);
	} else {
		tableContent = (
			<div className="overflow-auto rounded-lg border border-neutral-200 dark:border-black-600">
				<table className="w-full min-w-[640px] border-collapse text-left text-sm">
					<thead className="bg-neutral-50 dark:bg-black-800">
						<tr className="border-b border-neutral-200 dark:border-black-600">
							{columns.map((c) => (
								<th
									key={c.fieldId}
									className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
								>
									{(c.label ?? c.fieldId).trim() || c.fieldId}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{allRows.length === 0 ? (
							<tr className="border-b border-neutral-100 bg-white dark:border-black-600 dark:bg-black-800">
								<td
									colSpan={colCount}
									className="px-4 py-14 text-center text-sm text-neutral-500 dark:text-neutral-400"
								>
									No line items yet. Use New Line Item to add one.
								</td>
							</tr>
						) : showNoSearchResults ? (
							<tr className="border-b border-neutral-100 bg-white dark:border-black-600 dark:bg-black-800">
								<td
									colSpan={colCount}
									className="px-4 py-14 text-center text-sm text-neutral-500 dark:text-neutral-400"
								>
									No line items match your search.
								</td>
							</tr>
						) : (
							filteredRows.map((row) => (
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
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		);
	}

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
			{tableContent}
		</div>
	);
}
