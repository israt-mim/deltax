import { useQuery } from "@tanstack/react-query";
import {
	isMongoObjectIdString,
	listAgreementCategories,
	listAgreementDomains,
	listAgreementSteps,
	listAgreementSubtypes,
	listAgreementTypes,
} from "../services/agreementCatalog";
import { queryKeys } from "../queryKeys";

const CATALOG_PAGE = { page: 1, limit: 100, sort: "name" as const };

/** First page for agreement steps (`limit` ≤ 100 per API); add `q` / paging params later if the list grows. */
const STEPS_LIST_PAGE = { page: 1, limit: 100, sort: "name" as const };

export function useAgreementCategoriesQuery(options: { enabled: boolean }) {
	return useQuery({
		queryKey: [...queryKeys.agreementCatalog.all, "categories", CATALOG_PAGE] as const,
		queryFn: () => listAgreementCategories(CATALOG_PAGE),
		enabled: options.enabled,
		staleTime: 60_000,
	});
}

export function useAgreementDomainsQuery(options: { agreementCategoryId: string; enabled: boolean }) {
	const id = options.agreementCategoryId.trim();
	const canFetch = options.enabled && isMongoObjectIdString(id);
	return useQuery({
		queryKey: [...queryKeys.agreementCatalog.all, "domains", { agreement_category: id }] as const,
		queryFn: () => listAgreementDomains({ ...CATALOG_PAGE, agreement_category: id }),
		enabled: canFetch,
		staleTime: 30_000,
	});
}

export function useAgreementTypesQuery(options: { agreementDomainId: string; enabled: boolean }) {
	const id = options.agreementDomainId.trim();
	const canFetch = options.enabled && isMongoObjectIdString(id);
	return useQuery({
		queryKey: [...queryKeys.agreementCatalog.all, "types", { agreement_domain: id }] as const,
		queryFn: () => listAgreementTypes({ ...CATALOG_PAGE, agreement_domain: id }),
		enabled: canFetch,
		staleTime: 30_000,
	});
}

export function useAgreementSubtypesQuery(options: { agreementTypeId: string; enabled: boolean }) {
	const id = options.agreementTypeId.trim();
	const canFetch = options.enabled && isMongoObjectIdString(id);
	return useQuery({
		queryKey: [...queryKeys.agreementCatalog.all, "subtypes", { agreement_type: id }] as const,
		queryFn: () => listAgreementSubtypes({ ...CATALOG_PAGE, agreement_type: id }),
		enabled: canFetch,
		staleTime: 30_000,
	});
}

export function useAgreementStepsQuery(options: { enabled: boolean }) {
	return useQuery({
		queryKey: [...queryKeys.agreementCatalog.all, "steps", STEPS_LIST_PAGE] as const,
		queryFn: () => listAgreementSteps(STEPS_LIST_PAGE),
		enabled: options.enabled,
		staleTime: 60_000,
	});
}
