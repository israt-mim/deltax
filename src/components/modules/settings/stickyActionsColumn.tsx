import type { ReactNode } from "react";
import type { CellContext, ColumnDef } from "@tanstack/react-table";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import type { StickyColumnMeta } from "../../../hooks/useColumns";

const stickyActionsMeta: StickyColumnMeta = {
	isSticky: true,
	stickyRight: 0,
	isFirstSticky: true,
	sortable: false,
};

/** Right-sticky overflow menu column for settings tables. */
export function createStickyActionsColumn<T>(
	renderCell?: (info: CellContext<T, unknown>) => ReactNode
): ColumnDef<T, unknown> {
	return {
		id: "actions",
		header: "",
		size: 44,
		minSize: 44,
		maxSize: 44,
		enableResizing: false,
		meta: stickyActionsMeta,
		cell:
			renderCell ??
			(() => (
				<div className="flex items-center justify-center">
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-400" />
				</div>
			)),
	};
}
