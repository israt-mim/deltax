import type { AgreementConfigListItem } from "../api/services/agreementConfigs";
import type { AgreementListItem } from "../api/services/agreements";
import type { ClauseListItem } from "../api/services/clauses";

export type ChartSlice = { name: string; value: number; fill?: string };

const STATUS_COLORS: Record<string, string> = {
	draft: "#9ca3af",
	active: "#039855",
	archived: "#6b7280",
	cancelled: "#ef4444",
	unknown: "#d1d5db",
};

const TEMPLATE_COLORS = {
	active: "#016DCF",
	draft: "#9ca3af",
	completed: "#039855",
	incomplete: "#f59e0b",
};

function titleCase(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function aggregateAgreementStatus(items: AgreementListItem[]): ChartSlice[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const key = (item.status?.trim() || "unknown").toLowerCase();
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([name, value]) => ({
			name: titleCase(name),
			value,
			fill: STATUS_COLORS[name] ?? STATUS_COLORS.unknown,
		}))
		.sort((a, b) => b.value - a.value);
}

export function aggregateTemplateActivation(items: AgreementConfigListItem[]): ChartSlice[] {
	let active = 0;
	let draft = 0;
	for (const item of items) {
		if (item.isActive === false) draft += 1;
		else active += 1;
	}
	return [
		{ name: "Active", value: active, fill: TEMPLATE_COLORS.active },
		{ name: "Draft", value: draft, fill: TEMPLATE_COLORS.draft },
	].filter((s) => s.value > 0);
}

export function aggregateTemplateCompletion(items: AgreementConfigListItem[]): ChartSlice[] {
	let completed = 0;
	let incomplete = 0;
	for (const item of items) {
		if (item.isCompleted) completed += 1;
		else incomplete += 1;
	}
	return [
		{ name: "Configured", value: completed, fill: TEMPLATE_COLORS.completed },
		{ name: "In progress", value: incomplete, fill: TEMPLATE_COLORS.incomplete },
	].filter((s) => s.value > 0);
}

export function aggregateClauseActivity(items: ClauseListItem[]): ChartSlice[] {
	let active = 0;
	let inactive = 0;
	for (const item of items) {
		if (item.isActive === false) inactive += 1;
		else active += 1;
	}
	return [
		{ name: "Active", value: active, fill: "#016DCF" },
		{ name: "Inactive", value: inactive, fill: "#9ca3af" },
	].filter((s) => s.value > 0);
}

export type MonthlyCount = { month: string; count: number };

export function aggregateAgreementsByMonth(items: AgreementListItem[], months = 6): MonthlyCount[] {
	const now = new Date();
	const buckets: MonthlyCount[] = [];
	const keyToIndex = new Map<string, number>();

	for (let i = months - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
		keyToIndex.set(key, buckets.length);
		buckets.push({ month: label, count: 0 });
	}

	for (const item of items) {
		if (!item.createdAt) continue;
		const created = new Date(item.createdAt);
		if (Number.isNaN(created.getTime())) continue;
		const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
		const idx = keyToIndex.get(key);
		if (idx !== undefined) buckets[idx].count += 1;
	}

	return buckets.map(({ month, count }) => ({ month, count }));
}

export type CategoryCount = { name: string; count: number };

export function aggregateTopAgreementCategories(items: AgreementListItem[], limit = 6): CategoryCount[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const name = item.agreement_category?.name?.trim() || "Uncategorized";
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);
}
