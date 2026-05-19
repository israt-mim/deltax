import type { AgreementConfigApi } from "../api/services/agreementConfigs";

export const GLOBAL_FIELD_CONTEXT = "Global";

export interface FieldContextOption {
	value: string;
	label: string;
}

/** `Category - Domain - Type - Subtype` label for field context (must match server). */
export function buildAgreementConfigFieldContextLabel(config: {
	agreement_category?: { name?: string } | null;
	agreement_domain?: { name?: string } | null;
	agreement_type?: { name?: string } | null;
	agreement_subtype?: { name?: string } | null;
}): string | null {
	const parts = [
		config.agreement_category?.name,
		config.agreement_domain?.name,
		config.agreement_type?.name,
		config.agreement_subtype?.name,
	]
		.map((p) => p?.trim())
		.filter(Boolean);
	if (parts.length !== 4) return null;
	return parts.join(" - ");
}

export function isGlobalFieldContext(context: string | undefined | null): boolean {
	const t = context?.trim();
	return t === GLOBAL_FIELD_CONTEXT || t === "Generic";
}
