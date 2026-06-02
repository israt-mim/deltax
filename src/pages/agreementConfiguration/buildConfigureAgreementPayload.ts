import type { AgreementConfigApi, AgreementConfigureRequestBody } from "../../api/services/agreementConfigs";

/** Mirrors draft section shape in CreateAgreementConfiguration. */
export type ConfigureDraftSection = { id: string; name: string; fields: string[] };

export type ConfigureFieldOverrides = {
	addedBySectionKey: Record<string, string[]>;
	removedFieldIdBySectionKey: Record<string, string[]>;
	/** Optional display renames for section row keys (`api-{stepId}-{i}` / `draft-{uuid}`). */
	sectionNameBySectionKey?: Record<string, string>;
	/** Per wizard step, ordered section row keys for configure payload. */
	sectionOrderByStepId?: Record<string, string[]>;
	/** Per section row key, ordered field ids (drag-and-drop layout). */
	fieldOrderBySectionKey?: Record<string, string[]>;
	/** Section row keys that have been deleted by the user. */
	deletedSectionKeys?: string[];
};

function mergeFieldsForSectionKey(
	sectionKey: string,
	baseFields: string[],
	overrides: ConfigureFieldOverrides
): string[] {
	const removed = new Set(overrides.removedFieldIdBySectionKey[sectionKey] ?? []);
	const base = baseFields.filter((fid) => !removed.has(fid));
	const added = overrides.addedBySectionKey[sectionKey] ?? [];
	const merged = [...new Set([...base, ...added])];
	const order = overrides.fieldOrderBySectionKey?.[sectionKey];
	if (!order?.length) return merged;

	const mergedSet = new Set(merged);
	const ordered = order.filter((fid) => mergedSet.has(fid));
	const tail = merged.filter((fid) => !order.includes(fid));
	return [...ordered, ...tail];
}

function isAuthoringOrClausesCatalogStep(stepName: string): boolean {
	const n = stepName.trim().toLowerCase();
	return n === "authoring" || n === "clauses";
}

function buildSectionRowsForAgreementStep(
	stepId: string,
	config: AgreementConfigApi,
	draftsByStepId: Record<string, ConfigureDraftSection[]>,
	overrides: ConfigureFieldOverrides
): Array<{ name: string; fields: string[] }> {
	const configured = config.configuredSteps?.find((c) => c.id === stepId);
	const apiSections = configured?.sections ?? [];

	const rows: Array<{ key: string; name: string; fields: string[] }> = [];

	const deletedKeys = new Set(overrides.deletedSectionKeys ?? []);

	apiSections.forEach((s, i) => {
		const key = `api-${stepId}-${i}`;
		if (!deletedKeys.has(key)) rows.push({ key, name: s.name, fields: [...(s.fields ?? [])] });
	});

	for (const d of draftsByStepId[stepId] ?? []) {
		const key = `draft-${d.id}`;
		if (!deletedKeys.has(key)) rows.push({ key, name: d.name, fields: [...d.fields] });
	}

	const order = overrides.sectionOrderByStepId?.[stepId];
	const orderedRows =
		order?.length && order.length > 0
			? (() => {
					const byKey = new Map(rows.map((r) => [r.key, r]));
					const fromOrder = order
						.map((key) => byKey.get(key))
						.filter((r): r is (typeof rows)[number] => Boolean(r));
					const rest = rows.filter((r) => !order.includes(r.key));
					return [...fromOrder, ...rest];
				})()
			: rows;

	return orderedRows
		.map((r) => ({
			name: (overrides.sectionNameBySectionKey?.[r.key] ?? r.name).trim(),
			fields: mergeFieldsForSectionKey(r.key, r.fields, overrides),
		}))
		.filter((s) => s.name.length > 0);
}

/**
 * Builds PATCH /api/agreement-configs/:id/configure body.
 * `steps` length/order matches `config.steps`; Authoring/Clauses omit `sections`.
 */
export function buildConfigureAgreementPayload(
	config: AgreementConfigApi,
	draftsByStepId: Record<string, ConfigureDraftSection[]>,
	overrides: ConfigureFieldOverrides
): AgreementConfigureRequestBody {
	const steps = config.steps.map((step) => {
		const id = step._id;
		const name = step.name.trim();
		if (isAuthoringOrClausesCatalogStep(step.name)) {
			return { id, name };
		}
		const sections = buildSectionRowsForAgreementStep(id, config, draftsByStepId, overrides);
		return { id, name, sections };
	});
	return { steps };
}
