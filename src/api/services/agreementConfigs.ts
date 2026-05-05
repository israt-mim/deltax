import { del, get, patch, post } from "../client/http";

/** Matches server: string (name or ObjectId), or plain object variants. */
export type AgreementCatalogFieldInput =
	| string
	| { name: string }
	| { _id: string }
	| { id: string };

export interface CreateAgreementConfigBody {
	agreement_category: AgreementCatalogFieldInput;
	agreement_domain: AgreementCatalogFieldInput;
	agreement_type: AgreementCatalogFieldInput;
	agreement_subtype: AgreementCatalogFieldInput;
	/** Non-empty; each entry is an existing AgreementStep ObjectId string. */
	steps: string[];
}

export interface AgreementConfiguredSection {
	name: string;
	/** FieldConfiguration ObjectId strings (populated response is collapsed to ids). */
	fields: string[];
}

/** One wizard step layout; `sections` omitted for steps like Authoring / Clauses per server rules. */
export interface AgreementConfiguredStep {
	/** AgreementStep ObjectId (same logical step as `steps[i]._id` when aligned by order). */
	id: string;
	name: string;
	sections?: AgreementConfiguredSection[];
}

export interface AgreementConfigApi {
	_id: string;
	/** Human-readable id e.g. DAX-00007; may be absent on legacy documents. */
	displayId?: string;
	agreement_category: { _id: string; name: string; createdAt?: string; updatedAt?: string };
	agreement_domain: {
		_id: string;
		name: string;
		category?: string;
		createdAt?: string;
		updatedAt?: string;
	};
	agreement_type: {
		_id: string;
		name: string;
		domain?: string;
		createdAt?: string;
		updatedAt?: string;
	};
	agreement_subtype: {
		_id: string;
		name: string;
		agreementType?: string;
		createdAt?: string;
		updatedAt?: string;
	};
	steps: Array<{ _id: string; name: string; createdAt?: string; updatedAt?: string }>;
	/** false = Draft in UI */
	isActive?: boolean;
	isCompleted?: boolean;
	/** Present after configure; aligned with `steps` order. */
	configuredSteps?: AgreementConfiguredStep[];
	createdAt?: string;
	updatedAt?: string;
	createdBy?: string;
	updatedBy?: string;
}

export async function createAgreementConfig(body: CreateAgreementConfigBody): Promise<AgreementConfigApi> {
	return post<AgreementConfigApi>("/api/agreement-configs", body);
}

export async function getAgreementConfigById(id: string): Promise<AgreementConfigApi> {
	return get<AgreementConfigApi>(`/api/agreement-configs/${encodeURIComponent(id)}`);
}

/** PATCH /api/agreement-configs/:id/configure — wizard layout; sets isCompleted. */
export interface AgreementConfigureSectionRequest {
	name: string;
	fields: string[];
}

export interface AgreementConfigureStepRequest {
	id: string;
	name: string;
	sections?: AgreementConfigureSectionRequest[];
}

export interface AgreementConfigureRequestBody {
	steps: AgreementConfigureStepRequest[];
}

export async function configureAgreementConfig(
	id: string,
	body: AgreementConfigureRequestBody
): Promise<AgreementConfigApi> {
	return patch<AgreementConfigApi>(`/api/agreement-configs/${encodeURIComponent(id)}/configure`, body);
}

/** DELETE /api/agreement-configs/:id — hard-deletes the config document. */
export interface DeleteAgreementConfigResponse {
	message: string;
}

export async function deleteAgreementConfig(id: string): Promise<DeleteAgreementConfigResponse> {
	return del<DeleteAgreementConfigResponse>(`/api/agreement-configs/${encodeURIComponent(id)}`);
}
