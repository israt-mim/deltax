export type BreadcrumbItem = {
	label: string;
	href?: string;
};

export function crumb(label: string, href?: string): BreadcrumbItem {
	return href ? { label, href } : { label };
}

export function agreementCatalogListHref(categoryId: string, domainId: string): string {
	return `/agreements/${encodeURIComponent(categoryId)}/${encodeURIComponent(domainId)}`;
}

export type AgreementCatalogBreadcrumbInput = {
	categoryId?: string;
	categoryName?: string;
	domainId?: string;
	domainName?: string;
	displayName?: string;
};

/** Category + domain list trail, or Agreements fallback; optional display name for detail pages. */
export function buildAgreementBreadcrumb(input: AgreementCatalogBreadcrumbInput): BreadcrumbItem[] {
	const categoryId = input.categoryId?.trim();
	const domainId = input.domainId?.trim();
	const categoryName = input.categoryName?.trim();
	const domainName = input.domainName?.trim();
	const displayName = input.displayName?.trim();

	if (categoryId && domainId) {
		const href = agreementCatalogListHref(categoryId, domainId);
		const items: BreadcrumbItem[] = [
			crumb(categoryName || "Category", href),
			crumb(domainName || "Domain", href),
		];
		if (displayName) items.push(crumb(displayName));
		return items;
	}

	const items: BreadcrumbItem[] = [crumb("Agreements", "/agreements")];
	if (displayName) items.push(crumb(displayName));
	return items;
}

type AgreementDetailsCategory = {
	_id: string;
	name: string;
	domains: { _id: string; name: string }[];
};

/** Resolve category/domain labels from sidebar catalog for list routes. */
export function resolveAgreementCatalogLabels(
	categories: AgreementDetailsCategory[],
	categoryId: string | undefined,
	domainId: string | undefined
): { categoryId?: string; categoryName?: string; domainId?: string; domainName?: string } {
	const catId = categoryId?.trim();
	const domId = domainId?.trim();
	if (!catId || !domId) return {};

	for (const cat of categories) {
		if (cat._id === catId) {
			const domain = cat.domains?.find((d) => d._id === domId);
			return {
				categoryId: catId,
				categoryName: cat.name?.trim() || undefined,
				domainId: domId,
				domainName: domain?.name?.trim() || undefined,
			};
		}
	}

	for (const cat of categories) {
		const domain = cat.domains?.find((d) => d._id === domId);
		if (domain) {
			return {
				categoryId: cat._id,
				categoryName: cat.name?.trim() || undefined,
				domainId: domId,
				domainName: domain.name?.trim() || undefined,
			};
		}
	}

	return {
		categoryId: catId,
		domainId: domId,
	};
}
