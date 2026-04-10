import { useRef, useCallback, type UIEvent, type CSSProperties } from "react";
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
}

function getStickyMeta(col: { columnDef: { meta?: unknown } }): StickyColumnMeta | null {
	const meta = col.columnDef.meta as StickyColumnMeta | undefined;
	return meta?.isSticky ? meta : null;
}

function stickyStyle(meta: StickyColumnMeta): CSSProperties {
	return {
		position: "sticky",
		right: meta.stickyRight,
		zIndex: 5,
	};
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
}: InfiniteTableProps<TData>) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const columns: ColumnDef<TData, unknown>[] = enableRowSelection
		? [
				{
					id: "_select",
					size: 40,
					minSize: 40,
					maxSize: 40,
					enableResizing: false,
					header: ({ table: t }) => (
						<input
							type="checkbox"
							className="accent-success-500 w-4 h-4 cursor-pointer rounded"
							checked={t.getIsAllRowsSelected()}
							onChange={t.getToggleAllRowsSelectedHandler()}
						/>
					),
					cell: ({ row }) => (
						<input
							type="checkbox"
							className="accent-success-500 w-4 h-4 cursor-pointer rounded"
							checked={row.getIsSelected()}
							onChange={row.getToggleSelectedHandler()}
						/>
					),
				},
				...columnsProp,
			]
		: columnsProp;

	const table = useReactTable({
		data,
		columns,
		columnResizeMode,
		enableRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const { rows } = table.getRowModel();

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => rowHeight,
		overscan: 10,
	});

	const handleScroll = useCallback(
		(e: UIEvent<HTMLDivElement>) => {
			if (!onLoadMore || isLoading || !hasMore) return;
			const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
			if (scrollHeight - scrollTop - clientHeight < loadMoreThreshold) {
				onLoadMore();
			}
		},
		[onLoadMore, isLoading, hasMore, loadMoreThreshold]
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
		return {
			height: rowHeight,
			width: `var(--header-${header.id}-size)`,
			...(meta ? stickyStyle(meta) : {}),
		};
	};

	const getCellStyles = (cell: Cell<TData, unknown>): CSSProperties => {
		const meta = getStickyMeta(cell.column);
		return {
			width: `var(--col-${cell.column.id}-size)`,
			...(meta ? stickyStyle(meta) : {}),
		};
	};

	const getHeaderClassName = (header: Header<TData, unknown>) => {
		const meta = getStickyMeta(header.column);
		return cn(
			"relative text-left text-xs font-medium tracking-[0.02em] leading-[18px] text-neutral-500 dark:text-neutral-400 px-4 py-2.5 bg-neutral-50 dark:bg-black-800 border-b border-neutral-100 dark:border-black-600",
			meta?.isFirstSticky && "shadow-[-4px_0_8px_-2px_rgba(16,24,40,0.08)]"
		);
	};

	const getCellClassName = (cell: Cell<TData, unknown>) => {
		const meta = getStickyMeta(cell.column);
		return cn(
			"px-4 py-2.5 text-sm leading-5 text-neutral-600 dark:text-neutral-300 whitespace-nowrap overflow-hidden text-ellipsis border-b border-neutral-100 dark:border-black-600",
			meta?.isSticky && "bg-white dark:bg-black-800",
			meta?.isFirstSticky && "shadow-[-4px_0_8px_-2px_rgba(16,24,40,0.08)]"
		);
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
											<span className="inline-flex items-center gap-1">
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

						return (
							<tbody>
								{paddingTop > 0 && (
									<tr><td style={{ height: paddingTop }} /></tr>
								)}
								{virtualItems.map((virtualRow) => {
									const row = rows[virtualRow.index];
									return (
										<tr
											key={row.id}
											className="bg-white dark:bg-black-800 hover:bg-neutral-50 dark:hover:bg-black-700 transition-colors"
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
							</tbody>
						);
					})()}
				</table>

				{isLoading && (
					<div className="flex items-center justify-center py-4 text-sm text-neutral-400">
						Loading more...
					</div>
				)}

				{!hasMore && data.length > 0 && (
					<div className="flex items-center justify-center py-3 text-xs text-neutral-400">
						All rows loaded
					</div>
				)}
			</div>
		</div>
	);
}
