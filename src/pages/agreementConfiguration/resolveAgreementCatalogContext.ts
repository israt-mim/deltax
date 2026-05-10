import type {
	AgreementDetailsCategoryApi,
	AgreementDetailsDomainApi,
} from "../../api/services/agreementDetails";

function trimId(id?: string | null): string {
	return (id ?? "").trim();
}

function rowDomainId(d: AgreementDetailsDomainApi & { id?: string }): string {
	return trimId(d._id ?? d.id);
}

function rowCategoryId(c: AgreementDetailsCategoryApi & { id?: string }): string {
	return trimId(c._id ?? c.id);
}

/**
 * Resolves category + domain from the agreement details tree using URL (or modal) ids.
 * Tries strict path first, then finds domain by id across categories (domain ids are usually unique).
 */
export function resolveAgreementCatalogContext(
	categories: AgreementDetailsCategoryApi[],
	categoryId?: string,
	domainId?: string
): { category: AgreementDetailsCategoryApi | null; domain: AgreementDetailsDomainApi | null } {
	const cId = trimId(categoryId);
	const dId = trimId(domainId);
	if (!categories.length) return { category: null, domain: null };

	if (cId && dId) {
		const cat = categories.find((c) => rowCategoryId(c as AgreementDetailsCategoryApi & { id?: string }) === cId);
		const dom = cat?.domains?.find(
			(d) => rowDomainId(d as AgreementDetailsDomainApi & { id?: string }) === dId
		);
		if (cat && dom) return { category: cat, domain: dom };
	}

	if (dId) {
		for (const c of categories) {
			const dom = (c.domains ?? []).find(
				(d) => rowDomainId(d as AgreementDetailsDomainApi & { id?: string }) === dId
			);
			if (dom) return { category: c, domain: dom };
		}
	}

	if (cId) {
		const cat = categories.find((c) => rowCategoryId(c as AgreementDetailsCategoryApi & { id?: string }) === cId);
		if (cat) {
			const dom =
				(cat.domains ?? []).find(
					(d) => rowDomainId(d as AgreementDetailsDomainApi & { id?: string }) === dId
				) ??
				(cat.domains ?? [])[0] ??
				null;
			return { category: cat, domain: dom };
		}
	}

	return { category: null, domain: null };
}
