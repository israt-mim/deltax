import type {
	AgreementLineItemsTableBlock,
	AgreementLineItemsTableColumn,
	AgreementLineItemsTableRow,
	AgreementStepDetailsData,
	AgreementStepDetailsField,
	PatchAgreementFieldValueItem,
} from "../../api";
import { buildInitialFieldValues } from "./agreementStepDetailsValidation";

/** Build `{ fieldId: value }` from API line item (fieldValues array, cells map, or flat keys). */
export function valuesRecordFromLineItemPayload(lineItem: unknown): Record<string, unknown> {
	if (!lineItem || typeof lineItem !== "object" || Array.isArray(lineItem)) return {};
	const o = lineItem as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	if (Array.isArray(o.fieldValues)) {
		for (const entry of o.fieldValues) {
			if (!entry || typeof entry !== "object") continue;
			const e = entry as { field?: string; fieldId?: string; value?: unknown };
			const id = (e.fieldId ?? e.field)?.trim();
			if (id) out[id] = e.value;
		}
	}
	if (o.cells && typeof o.cells === "object" && !Array.isArray(o.cells)) {
		Object.assign(out, o.cells as Record<string, unknown>);
	}
	for (const [k, v] of Object.entries(o)) {
		if (["fieldValues", "cells", "_id", "id", "sections", "rowIndex"].includes(k)) continue;
		if (v !== null && typeof v === "object" && !Array.isArray(v)) continue;
		if (!(k in out)) out[k] = v;
	}
	return out;
}

export function fieldValuesArrayFromRecord(values: Record<string, unknown>): PatchAgreementFieldValueItem[] {
	const out: PatchAgreementFieldValueItem[] = [];
	for (const [k, v] of Object.entries(values)) {
		const id = k.trim();
		if (!id) continue;
		out.push({ field: id, value: v });
	}
	return out;
}

export function emptyLineItemValuesFromLayout(details: AgreementStepDetailsData): Record<string, unknown> {
	return buildInitialFieldValues(details);
}

export function findFieldDefById(
	details: AgreementStepDetailsData | null,
	fieldId: string
): AgreementStepDetailsField | undefined {
	if (!details?.sections) return undefined;
	for (const sec of details.sections) {
		for (const f of sec.fields ?? []) {
			if (f.id === fieldId) return f;
		}
	}
	return undefined;
}

export function displayLineItemCell(field: AgreementStepDetailsField | undefined, value: unknown): string {
	if (value == null || value === "") return "—";
	const dt = (field?.dataType ?? "String").trim();
	if (dt === "Boolean") return value ? "Yes" : "No";
	if (dt === "Currency" || dt === "Number" || dt === "Integer" || dt === "Decimal") {
		const n = Number(value);
		return Number.isFinite(n) ? String(n) : "—";
	}
	const s = typeof value === "string" ? value : JSON.stringify(value);
	const t = s.trim();
	if (t.length > 96) return `${t.slice(0, 93)}…`;
	return t || "—";
}

/** When `table` is absent, derive columns from layout sections and rows from `lineItems`. */
export function fallbackTableFromDetails(details: AgreementStepDetailsData | null): AgreementLineItemsTableBlock | null {
	if (!details?.sections?.length) return null;
	const columns: AgreementLineItemsTableColumn[] = [];
	for (const sec of details.sections) {
		for (const f of sec.fields ?? []) {
			if (f.visible === false) continue;
			columns.push({ fieldId: f.id, sectionName: sec.name?.trim(), label: f.name?.trim() });
		}
	}
	const rows: AgreementLineItemsTableRow[] = [];
	if (!Array.isArray(details.lineItems)) return { columns, rows };
	for (let i = 0; i < details.lineItems.length; i++) {
		const raw = details.lineItems[i];
		const cells = valuesRecordFromLineItemPayload(raw);
		const idRaw =
			raw && typeof raw === "object" && !Array.isArray(raw)
				? (raw as Record<string, unknown>)["_id"] ?? (raw as Record<string, unknown>)["id"]
				: undefined;
		const id = typeof idRaw === "string" && idRaw.trim() ? idRaw.trim() : `temp-${i}`;
		rows.push({ id, rowIndex: i, cells });
	}
	return { columns, rows };
}

export function resolveLineItemsTable(details: AgreementStepDetailsData | null): AgreementLineItemsTableBlock | null {
	if (!details) return null;
	if (details.table?.columns?.length && Array.isArray(details.table.rows)) return details.table;
	return fallbackTableFromDetails(details);
}

/** Client-side filter across displayed column values. */
export function filterLineItemTableRows(
	rows: AgreementLineItemsTableRow[],
	columns: AgreementLineItemsTableColumn[],
	details: AgreementStepDetailsData,
	query: string
): AgreementLineItemsTableRow[] {
	const q = query.trim().toLowerCase();
	if (!q) return rows;
	return rows.filter((row) => {
		const hay = columns
			.map((c) => displayLineItemCell(findFieldDefById(details, c.fieldId), row.cells[c.fieldId]))
			.join(" ")
			.toLowerCase();
		return hay.includes(q);
	});
}
