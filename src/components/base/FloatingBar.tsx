import type { ReactNode } from "react";
import cn from "classnames";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

export interface FloatingBarProps {
	/** When true and `selectedCount` > 0, the bar is shown. */
	open: boolean;
	selectedCount: number;
	/** Clears all selections (e.g. `setCheckedIds(new Set())`). */
	onClearSelection: () => void;
	/**
	 * Default right-side control: destructive **Delete** action.
	 * Ignored when `items` is passed — use `items` for fully custom actions (you can include your own delete there).
	 */
	onDelete?: () => void;
	/**
	 * Custom right-side toolbar (icons, buttons, etc.). When set (including an empty fragment),
	 * replaces the default **Delete** control — omit or pass `null` to use `onDelete` instead.
	 */
	items?: ReactNode | null;
	className?: string;
}

/**
 * Bulk-selection toolbar shown above a table: clear selection + count on the left;
 * either a default **Delete** (`onDelete`) or custom `items` on the right.
 */
export function FloatingBar({
	open,
	selectedCount,
	onClearSelection,
	onDelete,
	items,
	className,
}: FloatingBarProps) {
	const visible = open && selectedCount > 0;
	if (!visible) return null;

	const right =
		items != null ? (
			<div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">{items}</div>
		) : onDelete ? (
			<button
				type="button"
				onClick={onDelete}
				className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-red-200 transition-colors hover:bg-white/10 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
			>
				<DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
				Delete
			</button>
		) : null;

	return (
		<div
			className={cn(
				"flex min-h-[36px] flex-col gap-1.5 rounded-lg px-3 py-1.5 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-3",
				"bg-primary-600 shadow-md dark:bg-primary-400",
				className
			)}
			role="region"
			aria-label="Selection actions"
		>
			<div className="flex min-w-0 flex-1 items-center gap-2.5">
				<button
					type="button"
					onClick={onClearSelection}
					className="flex shrink-0 rounded-full p-1 text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
					aria-label="Clear selection"
				>
					<CloseOutlinedIcon sx={{ fontSize: 20 }} />
				</button>
				<div className="flex items-center gap-2">
					<span
						className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-semibold tabular-nums text-primary-700 dark:text-primary-900"
						aria-live="polite"
					>
						{selectedCount}
					</span>
					<span className="text-xs font-medium tracking-wide">Selected</span>
				</div>
			</div>
			{right}
		</div>
	);
}
