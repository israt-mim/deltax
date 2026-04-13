import { useMemo } from "react";
import { type ColumnDef, type CellContext } from "@tanstack/react-table";

export interface ColumnConfig<TData> {
	/** Unique key — used as the accessor into the row data */
	key: keyof TData & string;
	/** Display name shown in the header */
	name: string;
	/** Default width in px (passed as `size` to TanStack) */
	width?: number;
	/** Minimum width in px */
	minWidth?: number;
	/** Maximum width in px */
	maxWidth?: number;
	/** Whether the column can be resized. Defaults to true. */
	resizable?: boolean;
	/** Custom cell renderer */
	cell?: (info: CellContext<TData, unknown>) => React.ReactNode;
	/** Whether the column is visible. Defaults to true. */
	visible?: boolean;
	/** Show a sort indicator chevron next to the header */
	sortable?: boolean;
	/** Sticky column to the right. Multiple sticky columns stack from the rightmost edge. */
	isSticky?: boolean;
}

export interface StickyColumnMeta {
	isSticky: boolean;
	/** Sticky offset from the right edge (actions column). */
	stickyRight: number;
	/** When set with `isSticky`, the column sticks to the left instead of the right. */
	stickyLeft?: number;
	isFirstSticky: boolean;
	sortable: boolean;
}

export function useColumns<TData>(configs: ColumnConfig<TData>[]): ColumnDef<TData, unknown>[] {
	return useMemo(() => {
		const visible = configs.filter((col) => col.visible !== false);

		const stickyColumns = visible.filter((col) => col.isSticky);
		const stickyRightOffsets = new Map<string, number>();
		let accumulatedRight = 0;

		for (let i = stickyColumns.length - 1; i >= 0; i--) {
			stickyRightOffsets.set(stickyColumns[i].key, accumulatedRight);
			accumulatedRight += stickyColumns[i].width ?? 150;
		}

		const firstStickyKey = stickyColumns.length > 0 ? stickyColumns[0].key : null;

		return visible.map((col) => {
			const meta: StickyColumnMeta = {
				isSticky: col.isSticky === true,
				stickyRight: stickyRightOffsets.get(col.key) ?? 0,
				isFirstSticky: col.key === firstStickyKey,
				sortable: col.sortable === true,
			};

			const def: ColumnDef<TData, unknown> = {
				id: col.key,
				accessorKey: col.key,
				header: col.name,
				size: col.width ?? 150,
				minSize: col.minWidth ?? 50,
				maxSize: col.maxWidth ?? Number.MAX_SAFE_INTEGER,
				enableResizing: col.resizable !== false,
				meta,
			};

			if (col.cell) {
				def.cell = col.cell;
			}

			return def;
		});
	}, [configs]);
}
