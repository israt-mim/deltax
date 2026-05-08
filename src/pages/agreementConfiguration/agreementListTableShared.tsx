import type { ColumnDef } from "@tanstack/react-table";
import type { AgreementConfigListItem } from "../../api";
import { formatUsDateTime } from "../../lib/formatDateTime";
import type { ColumnConfig, StickyColumnMeta } from "../../hooks/useColumns";

export type AgreementConfigTableRow = {
	_id: string;
	displayId: string;
	categoryName: string;
	domainName: string;
	typeName: string;
	subtypeName: string;
	statusLabel: string;
	createdLabel: string;
};

function dashIfEmpty(value: string | undefined): string {
	const t = value?.trim();
	return t ? t : "—";
}

export function agreementConfigToTableRow(item: AgreementConfigListItem): AgreementConfigTableRow {
	const displayId = (item.displayId?.trim() || item._id).trim();
	let statusLabel = "Draft";
	if (item.isActive) statusLabel = "Active";
	else if (item.isCompleted) statusLabel = "Completed";
	const createdLabel = item.createdAt ? formatUsDateTime(item.createdAt) : "—";
	return {
		_id: item._id,
		displayId,
		categoryName: dashIfEmpty(item.agreement_category?.name),
		domainName: dashIfEmpty(item.agreement_domain?.name),
		typeName: dashIfEmpty(item.agreement_type?.name),
		subtypeName: dashIfEmpty(item.agreement_subtype?.name),
		statusLabel,
		createdLabel,
	};
}

const STATUS_COLORS: Record<string, string> = {
	Active: "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
	Draft: "bg-neutral-100 text-neutral-600 dark:bg-black-600 dark:text-neutral-300",
	Completed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

/** Scrollable columns — same order and labels as the full Agreements list. */
export const agreementListScrollableColumnConfigs: ColumnConfig<AgreementConfigTableRow>[] = [
	{
		key: "displayId",
		name: "Display ID",
		width: 140,
		minWidth: 100,
		sortable: true,
	},
	{
		key: "categoryName",
		name: "Category",
		width: 140,
		minWidth: 100,
		sortable: true,
	},
	{
		key: "domainName",
		name: "Domain",
		width: 140,
		minWidth: 100,
		sortable: true,
	},
	{
		key: "typeName",
		name: "Type",
		width: 140,
		minWidth: 100,
		sortable: true,
	},
	{
		key: "subtypeName",
		name: "Subtype",
		width: 180,
		minWidth: 120,
		sortable: true,
	},
	{
		key: "createdLabel",
		name: "Created",
		width: 180,
		minWidth: 140,
		sortable: true,
	},
];

export type AgreementStatusStickyMode = "standalone" | "before-actions";

/**
 * Right-sticky status column.
 * - `standalone`: rightmost column (e.g. Configure preview — no actions column).
 * - `before-actions`: sits left of a sticky actions column; pass that column’s width as `actionsColumnWidth`.
 */
export function agreementStatusColumnDef(
	mode: AgreementStatusStickyMode,
	actionsColumnWidth = 44
): ColumnDef<AgreementConfigTableRow, unknown> {
	const meta: StickyColumnMeta =
		mode === "standalone"
			? { isSticky: true, stickyRight: 0, isFirstSticky: true, sortable: true }
			: {
					isSticky: true,
					stickyRight: actionsColumnWidth,
					isFirstSticky: false,
					sortable: true,
				};

	return {
		id: "statusLabel",
		accessorKey: "statusLabel",
		header: "Status",
		size: 130,
		minSize: 90,
		maxSize: 400,
		enableResizing: true,
		meta,
		cell: ({ getValue }) => {
			const status = getValue() as string;
			return (
				<span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ""}`}>
					{status}
				</span>
			);
		},
	};
}
