import { post } from "../client/http";

export interface CreateAgreementBody {
	agreement_category_id: string;
	agreement_domain_id: string;
	agreement_type_id: string;
	agreement_subtype_id: string;
	agreement_display_name: string;
	agreement_type?: string;
	agreement_subtype?: string;
	displayId?: string;
}

export interface CreateAgreementResponse {
	id: string;
	displayId: string;
	status: string;
}

/** POST /api/agreements */
export async function createAgreement(body: CreateAgreementBody): Promise<CreateAgreementResponse> {
	return post<CreateAgreementResponse>("/api/agreements", body);
}
