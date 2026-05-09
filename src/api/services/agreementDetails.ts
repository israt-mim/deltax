import { get } from "../client/http";
import { buildQueryString } from "../client/queryString";

export interface AgreementDetailsSubtypeApi {
	_id: string;
	name: string;
}

export interface AgreementDetailsTypeApi {
	_id: string;
	name: string;
	subtypes: AgreementDetailsSubtypeApi[];
}

export interface AgreementDetailsDomainApi {
	_id: string;
	name: string;
	types: AgreementDetailsTypeApi[];
}

export interface AgreementDetailsCategoryApi {
	_id: string;
	name: string;
	domains: AgreementDetailsDomainApi[];
}

export interface AgreementDetailsStepApi {
	_id: string;
	name: string;
}

export interface AgreementDetailsResponse {
	categories: AgreementDetailsCategoryApi[];
	steps: AgreementDetailsStepApi[];
}

export interface GetAgreementDetailsParams {
	active_only?: boolean;
}

/** GET /api/config/agreements/details */
export async function getAgreementDetails(
	params: GetAgreementDetailsParams = { active_only: true }
): Promise<AgreementDetailsResponse> {
	const qs = buildQueryString({
		active_only: params.active_only === undefined ? "true" : params.active_only ? "true" : "false",
	});
	return get<AgreementDetailsResponse>(`/api/config/agreements/details${qs}`);
}
