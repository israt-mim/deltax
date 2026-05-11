import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import type { AgreementStepDetailsData } from "../../api";
import { Button } from "../../components/base/Button";
import { PageLoader } from "../../components/base/PageLoader";
import { Typography } from "../../components/base/Typography";
import { displayLineItemCell, findFieldDefById, resolveLineItemsTable } from "./agreementLineItemsUtils";

export interface AgreementLineItemsStepPanelProps {
	details: AgreementStepDetailsData | null;
	loading: boolean;
	errorMessage: string | null;
	onNewClick: () => void;
	onRowClick: (rowId: string) => void;
}

export function AgreementLineItemsStepPanel({
	details,
	loading,
	errorMessage,
	onNewClick,
	onRowClick,
}: AgreementLineItemsStepPanelProps) {
	const table = resolveLineItemsTable(details);
	const columns = table?.columns ?? [];

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

	if (!details?.sections?.length || columns.length === 0) {
		return (
			<p className="text-sm text-neutral-500 dark:text-neutral-400">
				No line item fields are configured for this agreement. Update the agreement configuration to add columns
				here.
			</p>
		);
	}

	const rows = table?.rows ?? [];
	const colCount = columns.length;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-end">
				<Button type="button" size="md" status="primary" onClick={onNewClick}>
					<AddOutlinedIcon sx={{ fontSize: 16 }} />
					New Line Item
				</Button>
			</div>

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
						{rows.length === 0 ? (
							<tr className="border-b border-neutral-100 bg-white dark:border-black-600 dark:bg-black-800">
								<td
									colSpan={colCount}
									className="px-4 py-14 text-center text-sm text-neutral-500 dark:text-neutral-400"
								>
									No line items yet. Use New Line Item to add one.
								</td>
							</tr>
						) : (
							rows.map((row) => (
								<tr
									key={row.id}
									role="button"
									tabIndex={0}
									className="cursor-pointer border-b border-neutral-100 bg-white hover:bg-neutral-50 dark:border-black-600 dark:bg-black-800 dark:hover:bg-black-700/50"
									onClick={() => onRowClick(row.id)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onRowClick(row.id);
										}
									}}
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
		</div>
	);
}
