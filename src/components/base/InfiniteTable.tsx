import { useRef, useCallback, useEffect, useMemo, type UIEvent, type CSSProperties } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	flexRender,
	type ColumnDef,
	type ColumnResizeMode,
	type Header,
	type Cell,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import cn from "classnames";
import type { StickyColumnMeta } from "../../hooks/useColumns";

export interface InfiniteTableProps<TData> {
	data: TData[];
	columns: ColumnDef<TData, unknown>[];
	height?: number | string;
	rowHeight?: number;
	onLoadMore?: () => void;
	isLoading?: boolean;
	hasMore?: boolean;
	loadMoreThreshold?: number;
	columnResizeMode?: ColumnResizeMode;
	className?: string;
	enableRowSelection?: boolean;
	/** When true and `data` is empty, header stays visible; body shows skeleton cells (no separate loading layout). */
	isInitialLoading?: boolean;
	/** Rows of skeleton placeholders when `isInitialLoading` (default 10). */
	skeletonRowCount?: number;
	/**
	 * Optional left-sticky checkbox column. Parent owns selection via `checkedIds` / `setCheckedIds`.
	 * Incompatible with `enableRowSelection` (TanStack built-in); prefer this for controlled selection.
	 */
	checkboxConfig?: InfiniteTableCheckboxConfig<TData>;
}

function getStickyMeta(col: { columnDef: { meta?: unknown } }): StickyColumnMeta | null {
	const meta = col.columnDef.meta as StickyColumnMeta | undefined;
	return meta?.isSticky ? meta : null;
}

function stickyStyle(meta: StickyColumnMeta): CSSProperties {
	if (meta.isSticky && meta.stickyLeft !== undefined) {
		return { position: "sticky", left: meta.stickyLeft };
	}
	if (meta.isSticky) {
		return { position: "sticky", right: meta.stickyRight, zIndex: 5 };
	}
	return {};
}

function idsHas(checkedIds: ReadonlySet<string> | readonly string[], id: string): boolean {
	if (Array.isArray(checkedIds)) return checkedIds.includes(id);
	return (checkedIds as ReadonlySet<string>).has(id);
}

function toIdSet(checkedIds: ReadonlySet<string> | readonly string[]): Set<string> {
	return new Set(Array.isArray(checkedIds) ? checkedIds : [...checkedIds]);
}

export interface InfiniteTableCheckboxConfig<TData> {
	getRowId: (row: TData) => string;
	checkedIds: ReadonlySet<string> | readonly string[];
	setCheckedIds: (ids: Set<string>) => void;
}

function SelectAllCheckboxHeader<TData>({
	data,
	getRowId,
	checkedIds,
	setCheckedIds,
}: {
	data: TData[];
	getRowId: (row: TData) => string;
	checkedIds: ReadonlySet<string> | readonly string[];
	setCheckedIds: (ids: Set<string>) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const rowIds = useMemo(() => data.map(getRowId), [data, getRowId]);
	const allChecked = rowIds.length > 0 && rowIds.every((id) => idsHas(checkedIds, id));
	const someChecked = rowIds.some((id) => idsHas(checkedIds, id));
	const indeterminate = someChecked && !allChecked;

	useEffect(() => {
		if (inputRef.current) inputRef.current.indeterminate = indeterminate;
	}, [indeterminate]);

	return (
		<div className="flex w-full items-center justify-center">
			<input
				ref={inputRef}
				type="checkbox"
				className="infinite-table-checkbox"
				checked={allChecked}
				onChange={() => {
					const next = toIdSet(checkedIds);
					if (allChecked) {
						rowIds.forEach((id) => next.delete(id));
					} else {
						rowIds.forEach((id) => next.add(id));
					}
					setCheckedIds(next);
				}}
				aria-label="Select all rows"
			/>
		</div>
	);
}

export function InfiniteTable<TData>({
	data,
	columns: columnsProp,
	height = 360,
	rowHeight = 40,
	onLoadMore,
	isLoading = false,
	hasMore = true,
	loadMoreThreshold = 200,
	columnResizeMode = "onChange",
	className,
	enableRowSelection = false,
	isInitialLoading = false,
	skeletonRowCount = 10,
	checkboxConfig,
}: InfiniteTableProps<TData>) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const checkboxColumn: ColumnDef<TData, unknown> | null = useMemo(() => {
		if (!checkboxConfig) return null;
		const { getRowId, checkedIds, setCheckedIds } = checkboxConfig;
		const stickyMeta: StickyColumnMeta = {
			isSticky: true,
			stickyRight: 0,
			stickyLeft: 0,
			isFirstSticky: true,
			sortable: false,
		};
		return {
			id: "_checkbox",
			size: 44,
			minSize: 44,
			maxSize: 44,
			enableResizing: false,
			meta: stickyMeta,
			header: () => (
				<SelectAllCheckboxHeader
					data={data}
					getRowId={getRowId}
					checkedIds={checkedIds}
					setCheckedIds={setCheckedIds}
				/>
			),
			cell: ({ row }) => (
				<div className="flex w-full min-w-0 items-center justify-center">
					<input
						type="checkbox"
						className="infinite-table-checkbox"
						checked={idsHas(checkedIds, getRowId(row.original))}
						onChange={() => {
							const id = getRowId(row.original);
							const next = toIdSet(checkedIds);
							if (next.has(id)) next.delete(id);
							else next.add(id);
							setCheckedIds(next);
						}}
						aria-label={`Select row ${getRowId(row.original)}`}
					/>
				</div>
			),
		};
	}, [checkboxConfig, data]);

	const columns: ColumnDef<TData, unknown>[] =
		checkboxColumn !== null
			? [checkboxColumn, ...columnsProp]
			: enableRowSelection
				? [
						{
							id: "_select",
							size: 40,
							minSize: 40,
							maxSize: 40,
							enableResizing: false,
							header: ({ table: t }) => (
								<div className="flex w-full min-w-0 items-center justify-center">
									<input
										type="checkbox"
										className="infinite-table-checkbox"
										checked={t.getIsAllRowsSelected()}
										onChange={t.getToggleAllRowsSelectedHandler()}
									/>
								</div>
							),
							cell: ({ row }) => (
								<div className="flex w-full min-w-0 items-center justify-center">
									<input
										type="checkbox"
										className="infinite-table-checkbox"
										checked={row.getIsSelected()}
										onChange={row.getToggleSelectedHandler()}
									/>
								</div>
							),
						},
						...columnsProp,
					]
				: columnsProp;

	const table = useReactTable({
		data,
		columns,
		columnResizeMode,
		enableRowSelection: checkboxConfig ? false : enableRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const { rows } = table.getRowModel();

	const isSkeletonBody = Boolean(isInitialLoading) && data.length === 0;
	const bodyRowCount = isSkeletonBody ? skeletonRowCount : rows.length;

	const virtualizer = useVirtualizer({
		count: bodyRowCount,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => rowHeight,
		overscan: 10,
	});

	const handleScroll = useCallback(
		(e: UIEvent<HTMLDivElement>) => {
			if (isSkeletonBody || !onLoadMore || isLoading || !hasMore) return;
			const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
			if (scrollHeight - scrollTop - clientHeight < loadMoreThreshold) {
				onLoadMore();
			}
		},
		[onLoadMore, isLoading, hasMore, loadMoreThreshold, isSkeletonBody]
	);

	const columnSizeVars = (() => {
		const headers = table.getFlatHeaders();
		const vars: Record<string, string> = {};
		for (const header of headers) {
			vars[`--header-${header.id}-size`] = `${header.getSize()}px`;
			vars[`--col-${header.column.id}-size`] = `${header.column.getSize()}px`;
		}
		return vars;
	})();

	const getHeaderStyles = (header: Header<TData, unknown>): CSSProperties => {
		const meta = getStickyMeta(header.column);
		const sticky = meta ? stickyStyle(meta) : {};
		const zLeft = meta?.stickyLeft !== undefined ? { zIndex: 15 } : {};
		return {
			height: rowHeight,
			width: `var(--header-${header.id}-size)`,
			...sticky,
			...zLeft,
		};
	};

	const getCellStyles = (cell: Cell<TData, unknown>): CSSProperties => {
		const meta = getStickyMeta(cell.column);
		const sticky = meta ? stickyStyle(meta) : {};
		const zLeft = meta?.stickyLeft !== undefined ? { zIndex: 6 } : {};
		return {
			width: `var(--col-${cell.column.id}-size)`,
			...sticky,
			...zLeft,
		};
	};

	const stickyLeftEdgeShadow =
		"shadow-[4px_0_8px_-2px_rgba(16,24,40,0.08)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.2)]";
	const stickyRightEdgeShadow = "shadow-[-4px_0_8px_-2px_rgba(16,24,40,0.08)]";

	const getHeaderClassName = (header: Header<TData, unknown>) => {
		const meta = getStickyMeta(header.column);
		const isStickyLeft = Boolean(meta?.isSticky && meta.stickyLeft !== undefined);
		const isStickyRightFirst = Boolean(meta?.isSticky && meta.stickyLeft === undefined && meta.isFirstSticky);
		return cn(
			"relative text-left text-xs font-medium tracking-[0.02em] leading-[18px] text-neutral-500 dark:text-neutral-400 px-4 py-2.5 bg-neutral-50 dark:bg-black-800 border-b border-neutral-100 dark:border-black-600",
			isStickyLeft && meta?.isFirstSticky && stickyLeftEdgeShadow,
			isStickyRightFirst && stickyRightEdgeShadow
		);
	};

	const getCellClassName = (cell: Cell<TData, unknown>) => {
		const meta = getStickyMeta(cell.column);
		const isStickyLeft = Boolean(meta?.isSticky && meta.stickyLeft !== undefined);
		const isStickyRightFirst = Boolean(meta?.isSticky && meta.stickyLeft === undefined && meta.isFirstSticky);
		return cn(
			"px-4 py-2.5 text-sm leading-5 text-neutral-600 dark:text-neutral-300 whitespace-nowrap overflow-hidden text-ellipsis border-b border-neutral-100 dark:border-black-600",
			meta?.isSticky &&
				"bg-white dark:bg-black-800 group-hover:bg-neutral-50 dark:group-hover:bg-black-700 transition-colors",
			isStickyLeft && meta?.isFirstSticky && stickyLeftEdgeShadow,
			isStickyRightFirst && stickyRightEdgeShadow
		);
	};

	const getSkeletonTdClassName = (header: Header<TData, unknown>) => {
		const meta = getStickyMeta(header.column);
		const isStickyLeft = Boolean(meta?.isSticky && meta.stickyLeft !== undefined);
		const isStickyRightFirst = Boolean(meta?.isSticky && meta.stickyLeft === undefined && meta.isFirstSticky);
		return cn(
			"px-4 py-2.5 align-middle border-b border-neutral-100 dark:border-black-600",
			meta?.isSticky && "bg-white dark:bg-black-800",
			isStickyLeft && meta?.isFirstSticky && stickyLeftEdgeShadow,
			isStickyRightFirst && stickyRightEdgeShadow
		);
	};

	const getSkeletonTdStyle = (header: Header<TData, unknown>): CSSProperties => {
		const meta = getStickyMeta(header.column);
		return {
			width: `var(--col-${header.column.id}-size)`,
			height: rowHeight,
			...(meta ? stickyStyle(meta) : {}),
		};
	};

	return (
		<div
			className={cn(
				"flex flex-col items-start isolate border border-neutral-200 dark:border-black-600 rounded-lg overflow-hidden self-stretch",
				className
			)}
		>
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="self-stretch rounded-lg overflow-auto scrollbar-hidden"
				style={{ height }}
				aria-busy={isSkeletonBody || undefined}
			>
				<table
					className="min-w-full border-collapse"
					style={{
						...columnSizeVars,
						width: table.getTotalSize(),
					}}
				>
					<thead className="sticky top-0 z-10">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className={getHeaderClassName(header)}
										style={getHeaderStyles(header)}
									>
									{header.isPlaceholder
										? null
										: (
											<span className="flex w-full min-w-0 items-center gap-1">
												{flexRender(header.column.columnDef.header, header.getContext())}
												{(header.column.columnDef.meta as StickyColumnMeta | undefined)?.sortable && (
													<svg width="10" height="10" viewBox="0 0 10 10" className="text-neutral-400 shrink-0">
														<path d="M2 4L5 7L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
													</svg>
												)}
											</span>
										)}

										{header.column.columnDef.enableResizing !== false && (
											<div
												onDoubleClick={() => header.column.resetSize()}
												onMouseDown={header.getResizeHandler()}
												onTouchStart={header.getResizeHandler()}
												className={cn(
													"absolute top-0 right-0 w-1 h-full cursor-col-resize select-none touch-none",
													"hover:bg-blue-500 active:bg-blue-500",
													header.column.getIsResizing() && "bg-blue-500 opacity-100"
												)}
											/>
										)}
									</th>
								))}
							</tr>
						))}
					</thead>

					{(() => {
						const virtualItems = virtualizer.getVirtualItems();
						const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
						const paddingBottom =
							virtualItems.length > 0
								? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
								: 0;
						const headerGroup = table.getHeaderGroups()[0];

						return (
							<tbody>
								{paddingTop > 0 && (
									<tr><td style={{ height: paddingTop }} /></tr>
								)}
								{virtualItems.map((virtualRow) => {
									if (isSkeletonBody) {
										return (
											<tr
												key={`sk-${virtualRow.index}`}
												className="bg-white dark:bg-black-800"
												style={{ height: rowHeight }}
												aria-hidden
											>
												{headerGroup.headers.map((header) => (
													<td
														key={header.id}
														className={getSkeletonTdClassName(header)}
														style={getSkeletonTdStyle(header)}
													>
														{header.column.id === "_select" || header.column.id === "_checkbox" ? (
															<div className="mx-auto h-4 w-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
														) : (
															<div className="h-3 w-[85%] max-w-[160px] animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700" />
														)}
													</td>
												))}
											</tr>
										);
									}
									const row = rows[virtualRow.index];
									return (
										<tr
											key={row.id}
											className="group bg-white dark:bg-black-800 hover:bg-neutral-50 dark:hover:bg-black-700 transition-colors"
											style={{ height: rowHeight }}
										>
											{row.getVisibleCells().map((cell) => (
												<td
													key={cell.id}
													className={getCellClassName(cell)}
													style={getCellStyles(cell)}
												>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											))}
										</tr>
									);
								})}
								{paddingBottom > 0 && (
									<tr><td style={{ height: paddingBottom }} /></tr>
								)}
								{isLoading &&
									data.length > 0 &&
									[0, 1, 2].map((i) => (
										<tr
											key={`more-sk-${i}`}
											className="bg-white dark:bg-black-800"
											style={{ height: rowHeight }}
											aria-hidden
										>
											{headerGroup.headers.map((header) => (
												<td
													key={`${header.id}-${i}`}
													className={getSkeletonTdClassName(header)}
													style={getSkeletonTdStyle(header)}
												>
													{header.column.id === "_select" || header.column.id === "_checkbox" ? (
														<div className="mx-auto h-4 w-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
													) : (
														<div className="h-3 w-[85%] max-w-[160px] animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700" />
													)}
												</td>
											))}
										</tr>
									))}
							</tbody>
						);
					})()}
				</table>
			</div>
		</div>
	);
}
