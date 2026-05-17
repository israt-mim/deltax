import type { ReactNode } from "react";
import cn from "classnames";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

/** Destructive action on the themed primary floating bar — red label on a light chip for contrast. */
export const floatingBarDangerActionClass =
	"inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-red-600 dark:hover:bg-red-50";

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
	/** Label for the default delete control (default: `Delete`). */
	deleteLabel?: string;
	/** Disables the default delete control and shows a pending label when set. */
	deletePending?: boolean;
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
	deleteLabel = "Delete",
	deletePending = false,
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
				disabled={deletePending}
				className={floatingBarDangerActionClass}
			>
				<DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
				{deletePending ? "Deleting…" : deleteLabel}
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
