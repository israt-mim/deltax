import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { AgreementStepDetailsData, AgreementStepDetailsField } from "../../api";

function normalizeChoiceOptions(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((x) => (typeof x === "string" ? x : String(x)));
}

function toDayjsOrNull(v: unknown): Dayjs | null {
	if (v == null || v === "") return null;
	if (dayjs.isDayjs(v)) return v;
	const d = dayjs(String(v));
	return d.isValid() ? d : null;
}

function isEmpty(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "string" && value.trim() === "") return true;
	if (typeof value === "number" && !Number.isFinite(value)) return true;
	return false;
}

/** Hide catalog tags that only duplicate “required” (the form already shows a red *). */
export function filterTagsForDisplay(tags: string[] | undefined): string[] {
	if (!tags?.length) return [];
	return tags.filter((t) => {
		const s = String(t).trim();
		if (!s) return false;
		return !/^required$/i.test(s);
	});
}

export function buildInitialFieldValues(details: AgreementStepDetailsData): Record<string, unknown> {
	const next: Record<string, unknown> = {};
	for (const sec of details.sections ?? []) {
		for (const f of sec.fields ?? []) {
			next[f.id] = f.value;
		}
	}
	return next;
}

function normalizeFieldValueForCompare(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "boolean") return value ? "1" : "0";
	if (typeof value === "number") {
		return Number.isFinite(value) ? String(value) : "";
	}
	if (dayjs.isDayjs(value)) {
		return value.isValid() ? value.toISOString() : "";
	}
	return String(value).trim();
}

/** True when any field value differs from the loaded step baseline. */
export function agreementFieldValuesDiffer(
	baseline: Record<string, unknown>,
	current: Record<string, unknown>
): boolean {
	const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
	for (const key of keys) {
		if (
			normalizeFieldValueForCompare(baseline[key]) !==
			normalizeFieldValueForCompare(current[key])
		) {
			return true;
		}
	}
	return false;
}

function isFieldSatisfied(field: AgreementStepDetailsField, value: unknown): boolean {
	if (!field.required) return true;
	const dt = (field.dataType ?? "String").trim();
	if (dt === "Boolean") {
		return true;
	}
	if (dt === "Currency" || dt === "Number" || dt === "Integer" || dt === "Decimal") {
		if (isEmpty(value)) return false;
		return Number.isFinite(Number(value));
	}
	if (dt === "Date" || dt === "DateTime") {
		return !isEmpty(value) && toDayjsOrNull(value) !== null;
	}
	if (dt === "Choice" || normalizeChoiceOptions(field.choiceOptions).length > 0) {
		return !isEmpty(value);
	}
	return typeof value === "string"
		? value.trim().length > 0
		: value !== null && value !== undefined && String(value).trim() !== "";
}

/**
 * Validates visible, required fields for the current step layout.
 */
export function validateRequiredAgreementFields(
	details: AgreementStepDetailsData | null,
	values: Record<string, unknown>
): { ok: boolean; missingLabels: string[]; missingFieldIds: string[] } {
	if (!details?.sections?.length) {
		return { ok: true, missingLabels: [], missingFieldIds: [] };
	}
	const missing: string[] = [];
	const missingFieldIds: string[] = [];
	for (const sec of details.sections) {
		for (const field of sec.fields ?? []) {
			if (field.visible === false) continue;
			if (!field.required) continue;
			const v = values[field.id];
			if (!isFieldSatisfied(field, v)) {
				missing.push(field.name?.trim() || "Field");
				missingFieldIds.push(field.id);
			}
		}
	}
	return { ok: missing.length === 0, missingLabels: missing, missingFieldIds };
}
