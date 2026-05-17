import { useEffect, useMemo } from "react";
import { useBreadcrumbContext } from "../context/BreadcrumbContext";
import type { BreadcrumbItem } from "../lib/breadcrumb";

export function usePageBreadcrumb(items: BreadcrumbItem[]) {
	const { setBreadcrumbs } = useBreadcrumbContext();
	const serialized = useMemo(() => JSON.stringify(items), [items]);

	useEffect(() => {
		setBreadcrumbs(items);
		return () => setBreadcrumbs([]);
		// serialized tracks item label/href changes without referential equality on `items`
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [serialized, setBreadcrumbs]);
}
