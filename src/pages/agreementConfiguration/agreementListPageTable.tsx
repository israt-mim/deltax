import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import type { AgreementListItem } from "../../api";
import { formatUsDateTime } from "../../lib/formatDateTime";
import type { ColumnConfig } from "../../hooks/useColumns";

export type AgreementListPageRow = {
	_id: string;
	displayId: string;
	displayName: string;
	typeName: string;
	subtypeName: string;
	createdByLabel: string;
	modifiedByLabel: string;
	createdOnLabel: string;
	modifiedOnLabel: string;
	statusLabel: string;
	/** Placeholder field for the actions column accessor (always null). */
	_menu: null;
};

function dashIfEmpty(value: string | undefined): string {
	const t = value?.trim();
	return t ? t : "—";
}

function formatAgreementStatusLabel(status: string | undefined): string {
	const raw = status?.trim().toLowerCase();
	if (!raw) return "—";
	return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const AGREEMENT_LIST_STATUS_COLORS: Record<string, string> = {
	Active: "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
	Draft: "bg-error-100 text-error-600",
	Archived: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
	Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
};

export function agreementListItemToListPageRow(item: AgreementListItem): AgreementListPageRow {
	const displayId = (item.displayId?.trim() || item._id).trim();
	const displayName = item.agreement_display_name?.trim() || "—";
	const createdByLabel = [item.createdBy?.firstName, item.createdBy?.lastName].filter(Boolean).join(" ").trim();
	const modifiedByLabel = [item.modifiedBy?.firstName, item.modifiedBy?.lastName].filter(Boolean)
		.join(" ")
		.trim();
	const statusLabel = formatAgreementStatusLabel(item.status);

	return {
		_id: item._id,
		displayId,
		displayName,
		typeName: dashIfEmpty(item.agreement_type?.name),
		subtypeName: dashIfEmpty(item.agreement_subtype?.name),
		createdByLabel: dashIfEmpty(createdByLabel || item.createdBy?.username || item.createdBy?.email),
		modifiedByLabel: dashIfEmpty(modifiedByLabel || item.modifiedBy?.username || item.modifiedBy?.email),
		createdOnLabel: item.createdAt ? formatUsDateTime(item.createdAt) : "—",
		modifiedOnLabel: item.modifiedAt ? formatUsDateTime(item.modifiedAt) : "—",
		statusLabel,
		_menu: null,
	};
}

export function AgreementRowMenu({
	row,
	onDeleteRequest,
}: {
	row: AgreementListPageRow;
	onDeleteRequest: (row: AgreementListPageRow) => void;
}) {
	const items: MenuProps["items"] = [
		{
			key: "delete",
			icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
			label: "Delete",
			danger: true,
		},
	];

	return (
		<div
			className="flex items-center justify-center"
			data-row-click-ignore
			onClick={(e) => e.stopPropagation()}
		>
			<Dropdown
				trigger={["click"]}
				classNames={{ root: "actions-dropdown-icon" }}
				menu={{
					items,
					onClick: ({ key, domEvent }) => {
						domEvent.preventDefault();
						domEvent.stopPropagation();
						if (key === "delete") onDeleteRequest(row);
					},
				}}
			>
				<button
					type="button"
					aria-label="Agreement actions"
					className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
				>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</button>
			</Dropdown>
		</div>
	);
}

/** Right-sticky overflow menu column; append after `agreementListPageColumnConfigs`. */
export function agreementListMenuColumnConfig(
	onDeleteRequest: (row: AgreementListPageRow) => void
): ColumnConfig<AgreementListPageRow> {
	return {
		key: "_menu",
		name: "",
		width: 44,
		minWidth: 44,
		maxWidth: 44,
		resizable: false,
		isSticky: true,
		cell: ({ row }) => <AgreementRowMenu row={row.original} onDeleteRequest={onDeleteRequest} />,
	};
}

export const agreementListPageColumnConfigs: ColumnConfig<AgreementListPageRow>[] = [
	{ key: "displayId", name: "Display ID", width: 140, minWidth: 100, sortable: true },
	{ key: "displayName", name: "Display Name", width: 200, minWidth: 140, sortable: true },
	{ key: "typeName", name: "Type", width: 140, minWidth: 100, sortable: true },
	{ key: "subtypeName", name: "Subtype", width: 180, minWidth: 120, sortable: true },
	{ key: "createdByLabel", name: "Created By", width: 140, minWidth: 100, sortable: true },
	{ key: "createdOnLabel", name: "Created on", width: 180, minWidth: 140, sortable: true },
	{ key: "modifiedByLabel", name: "Modified By", width: 140, minWidth: 100, sortable: true },
	{ key: "modifiedOnLabel", name: "Modified on", width: 180, minWidth: 140, sortable: true },
	{
		key: "statusLabel",
		name: "Status",
		width: 120,
		minWidth: 90,
		sortable: true,
		isSticky: true,
		cell: ({ getValue }) => {
			const status = getValue() as string;
			if (!status || status === "—") {
				return <span className="text-neutral-400">—</span>;
			}
			return (
				<span
					className={`rounded px-2 py-0.5 text-xs font-medium ${AGREEMENT_LIST_STATUS_COLORS[status] ?? "bg-neutral-100 text-neutral-600 dark:bg-black-600 dark:text-neutral-300"}`}
				>
					{status}
				</span>
			);
		},
	},
];
