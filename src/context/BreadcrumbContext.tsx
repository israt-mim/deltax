import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import type { BreadcrumbItem } from "../lib/breadcrumb";

export type { BreadcrumbItem };

type BreadcrumbContextValue = {
	items: BreadcrumbItem[];
	setBreadcrumbs: (items: BreadcrumbItem[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<BreadcrumbItem[]>([]);

	const setBreadcrumbs = useCallback((next: BreadcrumbItem[]) => {
		setItems(next);
	}, []);

	const value = useMemo(
		() => ({
			items,
			setBreadcrumbs,
		}),
		[items, setBreadcrumbs]
	);

	return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbContext(): BreadcrumbContextValue {
	const ctx = useContext(BreadcrumbContext);
	if (!ctx) {
		throw new Error("useBreadcrumbContext must be used within BreadcrumbProvider");
	}
	return ctx;
}
