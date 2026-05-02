import { get, post } from "../client/http";

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

export interface AgreementConfigApi {
	_id: string;
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
