import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";

export const RESIZABLE_SIDEBAR_DEFAULT_WIDTH = 720;
export const RESIZABLE_SIDEBAR_MIN_WIDTH = 600;
export const RESIZABLE_SIDEBAR_MAX_WIDTH = 900;

function clampWidth(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export interface ResizableSidebarProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	/** When set, parent can reserve horizontal space (e.g. padding on main content). */
	onWidthChange?: (width: number) => void;
	/** `page` = absolute right column inside a relative full-height container. */
	variant?: "inline" | "page";
	className?: string;
	/** Initial width when the sidebar opens (clamped to min/max). */
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
}

export function ResizableSidebar({
	open,
	onClose,
	title,
	children,
	onWidthChange,
	variant = "inline",
	className = "",
	defaultWidth = RESIZABLE_SIDEBAR_DEFAULT_WIDTH,
	minWidth = RESIZABLE_SIDEBAR_MIN_WIDTH,
	maxWidth = RESIZABLE_SIDEBAR_MAX_WIDTH,
}: ResizableSidebarProps) {
	const bounds = useMemo(() => {
		const min = Math.max(200, minWidth);
		const max = Math.max(min, maxWidth);
		return { min, max };
	}, [minWidth, maxWidth]);

	const [width, setWidth] = useState(() =>
		clampWidth(defaultWidth, bounds.min, bounds.max)
	);
	const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

	const setWidthAndNotify = useCallback(
		(next: number) => {
			const clamped = clampWidth(next, bounds.min, bounds.max);
			setWidth(clamped);
			onWidthChange?.(clamped);
		},
		[bounds.max, bounds.min, onWidthChange]
	);

	useEffect(() => {
		if (!open) return;
		setWidth((prev) => clampWidth(prev, bounds.min, bounds.max));
	}, [open, bounds.min, bounds.max]);

	useEffect(() => {
		if (!open) return;
		onWidthChange?.(clampWidth(width, bounds.min, bounds.max));
	}, [open, width, bounds.min, bounds.max, onWidthChange]);

	useEffect(() => {
		if (!open || variant !== "page") return;

		const onWindowResize = () => {
			setWidth((prev) => {
				const viewportCap = Math.floor(window.innerWidth * 0.85);
				const max = Math.min(bounds.max, viewportCap);
				const clamped = clampWidth(prev, bounds.min, max);
				onWidthChange?.(clamped);
				return clamped;
			});
		};

		onWindowResize();
		window.addEventListener("resize", onWindowResize);
		return () => window.removeEventListener("resize", onWindowResize);
	}, [open, variant, bounds.min, bounds.max, onWidthChange]);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onClose]);

	const onPointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			dragRef.current = { startX: e.clientX, startWidth: width };
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		},
		[width]
	);

	const onPointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!dragRef.current) return;
			const delta = dragRef.current.startX - e.clientX;
			setWidthAndNotify(dragRef.current.startWidth + delta);
		},
		[setWidthAndNotify]
	);

	const onPointerUp = useCallback((e: React.PointerEvent) => {
		dragRef.current = null;
		try {
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* already released */
		}
	}, []);

	if (!open) return null;

	const isPage = variant === "page";

	return (
		<aside
			className={[
				"flex shrink-0 flex-col overflow-hidden border-l border-neutral-200 bg-white dark:border-black-600 dark:bg-black-800",
				isPage ? "absolute inset-y-0 right-0 z-20 shadow-lg" : "relative h-full",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				width,
				minWidth: bounds.min,
				maxWidth: bounds.max,
			}}
			role="complementary"
			aria-label={title || "Sidebar"}
		>
			<div
				className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-primary-200/50 dark:hover:bg-primary-700/30"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				aria-hidden
			/>
			{title ? (
				<header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-3 dark:border-black-600">
					<h2 className="min-w-0 truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-black-700"
						aria-label="Close sidebar"
					>
						<CloseOutlinedIcon sx={{ fontSize: 18 }} />
					</button>
				</header>
			) : null}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
		</aside>
	);
}
