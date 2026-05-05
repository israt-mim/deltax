import type { AgreementConfigApi, AgreementConfigureRequestBody } from "../../api/services/agreementConfigs";

/** Mirrors draft section shape in CreateAgreementConfiguration. */
export type ConfigureDraftSection = { id: string; name: string; fields: string[] };

export type ConfigureFieldOverrides = {
	addedBySectionKey: Record<string, string[]>;
	removedFieldIdBySectionKey: Record<string, string[]>;
};

function mergeFieldsForSectionKey(
	sectionKey: string,
	baseFields: string[],
	overrides: ConfigureFieldOverrides
): string[] {
	const removed = new Set(overrides.removedFieldIdBySectionKey[sectionKey] ?? []);
	const base = baseFields.filter((fid) => !removed.has(fid));
	const added = overrides.addedBySectionKey[sectionKey] ?? [];
	return [...new Set([...base, ...added])];
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

	apiSections.forEach((s, i) => {
		rows.push({
			key: `api-${stepId}-${i}`,
			name: s.name,
			fields: [...(s.fields ?? [])],
		});
	});

	for (const d of draftsByStepId[stepId] ?? []) {
		rows.push({
			key: `draft-${d.id}`,
			name: d.name,
			fields: [...d.fields],
		});
	}

	return rows
		.map((r) => ({
			name: r.name.trim(),
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
