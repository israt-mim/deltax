import type { AgreementConfigListItem } from "../../api";
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
};

function dashIfEmpty(value: string | undefined): string {
	const t = value?.trim();
	return t ? t : "—";
}

/** List API has no separate display name; use subtype then type as the closest human-facing label. */
export function agreementListItemToListPageRow(item: AgreementConfigListItem): AgreementListPageRow {
	const displayId = (item.displayId?.trim() || item._id).trim();
	const subtypeTrimmed = item.agreement_subtype?.name?.trim();
	const typeTrimmed = item.agreement_type?.name?.trim();
	const displayName = subtypeTrimmed || typeTrimmed || "—";
	return {
		_id: item._id,
		displayId,
		displayName,
		typeName: dashIfEmpty(item.agreement_type?.name),
		subtypeName: dashIfEmpty(item.agreement_subtype?.name),
		createdByLabel: dashIfEmpty(item.createdBy),
		modifiedByLabel: dashIfEmpty(item.updatedBy),
		createdOnLabel: item.createdAt ? formatUsDateTime(item.createdAt) : "—",
		modifiedOnLabel: item.updatedAt ? formatUsDateTime(item.updatedAt) : "—",
	};
}

export const agreementListPageColumnConfigs: ColumnConfig<AgreementListPageRow>[] = [
	{ key: "displayId", name: "Display ID", width: 140, minWidth: 100, sortable: true },
	{ key: "displayName", name: "Display Name", width: 200, minWidth: 140, sortable: true },
	{ key: "typeName", name: "Type", width: 140, minWidth: 100, sortable: true },
	{ key: "subtypeName", name: "Subtype", width: 180, minWidth: 120, sortable: true },
	{ key: "createdByLabel", name: "Created By", width: 140, minWidth: 100, sortable: true },
	{ key: "modifiedByLabel", name: "Modified By", width: 140, minWidth: 100, sortable: true },
	{ key: "createdOnLabel", name: "Created on", width: 180, minWidth: 140, sortable: true },
	{ key: "modifiedOnLabel", name: "Modified on", width: 180, minWidth: 140, sortable: true },
];
