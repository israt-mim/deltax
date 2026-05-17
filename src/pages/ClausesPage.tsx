import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { Title } from "../components/base/Title";
import type { StickyColumnMeta } from "../hooks/useColumns";
import { type ClauseListItem, useClausesInfiniteList } from "../api";
import { formatUsDateTime } from "../lib/formatDateTime";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { FormInput } from "../components/form-input/FormInput";
import { CLAUSE_SCROLL_COLUMN_SPECS } from "./clauses/clauseListColumns";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";

const DATE_IDS = new Set(["createdAt", "updatedAt", "validFrom", "validTo"]);

const LONG_TEXT_IDS = new Set(["text", "description"]);

function readClauseField(row: ClauseListItem, id: string): unknown {
	if (id === "displayId") return row.displayId?.trim() || row._id;
	return (row as unknown as Record<string, unknown>)[id];
}

function formatClauseCell(id: string, value: unknown): ReactNode {
	if (value === undefined || value === null) return "—";

	if (id === "tags" && Array.isArray(value)) {
		const parts = value.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
		if (!parts.length) return "—";
		return (
			<div className="flex min-w-0 max-w-full flex-wrap gap-1">
				{parts.map((tag) => (
					<span
						key={tag}
						className="max-w-[220px] truncate rounded bg-warning-100 px-1.5 py-0.5 text-xs font-medium text-warning-800 dark:bg-warning-900 dark:text-warning-200"
					>
						{tag}
					</span>
				))}
			</div>
		);
	}

	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "number") return String(value);

	if (typeof value === "string") {
		const t = value.trim();
		if (!t) return "—";
		if (DATE_IDS.has(id)) {
			const formatted = formatUsDateTime(t);
			return formatted || "—";
		}
		if (LONG_TEXT_IDS.has(id)) {
			return (
				<span className="line-clamp-2 block min-w-0 max-w-full text-left" title={t}>
					{t}
				</span>
			);
		}
		return t;
	}

	return String(value);
}

function buildScrollColumnDefs(): ColumnDef<ClauseListItem, unknown>[] {
	return CLAUSE_SCROLL_COLUMN_SPECS.map((spec) => ({
		id: spec.id,
		accessorFn: (row) => readClauseField(row, spec.id),
		header: spec.header,
		size: spec.width,
		minSize: spec.minWidth ?? Math.min(spec.width, 64),
		maxSize: spec.maxSize ?? Math.min(spec.width + 120, 400),
		enableResizing: true,
		cell: ({ getValue }) => formatClauseCell(spec.id, getValue()),
	}));
}

const ACTIVE_COLORS: Record<string, string> = {
	Active: "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
	Inactive: "bg-neutral-100 text-neutral-600 dark:bg-black-600 dark:text-neutral-300",
};

const statusStickyMeta: StickyColumnMeta = {
	isSticky: true,
	stickyRight: 0,
	isFirstSticky: true,
	sortable: true,
};

function statusColumnDef(): ColumnDef<ClauseListItem, unknown> {
	return {
		id: "isActive",
		accessorFn: (row) => row.isActive,
		header: "Status",
		size: 108,
		minSize: 88,
		maxSize: 200,
		enableResizing: true,
		meta: statusStickyMeta,
		cell: ({ getValue }) => {
			const v = getValue();
			if (v === true) {
				return (
					<span className={`px-2 py-0.5 text-xs font-medium rounded ${ACTIVE_COLORS.Active}`}>Active</span>
				);
			}
			if (v === false) {
				return (
					<span className={`px-2 py-0.5 text-xs font-medium rounded ${ACTIVE_COLORS.Inactive}`}>
						Inactive
					</span>
				);
			}
			return "—";
		},
	};
}

/** Clauses list: GET /api/clauses + infinite table (all flattened columns). */
export const ClausesPage = () => {
	const navigate = useNavigate();
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	usePageBreadcrumb([crumb("Clauses", "/clauses")]);

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
		return () => window.clearTimeout(t);
	}, [searchInput]);

	const listQuery = useClausesInfiniteList({
		search: debouncedSearch || undefined,
		sort: "-createdAt",
	});

	const scrollColumnDefs = useMemo(() => buildScrollColumnDefs(), []);
	const tableColumns = useMemo(() => [...scrollColumnDefs, statusColumnDef()], [scrollColumnDefs]);

	const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const isInitialLoading = listQuery.isLoading && !listQuery.data;
	const isLoadingMore = listQuery.isFetchingNextPage;
	const hasMore = Boolean(listQuery.hasNextPage);

	return (
		<CardMain className="flex flex-col gap-4">
			<Title>Clauses</Title>

			{listQuery.isError && (
				<p className="text-sm text-error-500">
					{formatUserFacingError(listQuery.error, "Could not load clauses.")}{" "}
					<button
						type="button"
						className="font-medium text-primary-600 underline dark:text-primary-400"
						onClick={() => void listQuery.refetch()}
					>
						Retry
					</button>
				</p>
			)}

			<Card className="flex flex-col gap-3">
				<FormInput
					placeholder="Search clauses…"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="max-w-md"
				/>
				<InfiniteTable
					data={rows}
					columns={tableColumns}
					height="calc(100vh - 260px)"
					onLoadMore={loadMore}
					isLoading={isLoadingMore}
					isInitialLoading={isInitialLoading}
					hasMore={hasMore}
					onRowClick={(row) => void navigate(`/clauses/${encodeURIComponent(row._id)}`)}
				/>
			</Card>
		</CardMain>
	);
};
