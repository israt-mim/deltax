import cn from "classnames";

type SkeletonRounded = "none" | "sm" | "md" | "lg" | "full";

export interface SkeletonProps {
	className?: string;
	rounded?: SkeletonRounded;
}

const ROUNDED: Record<SkeletonRounded, string> = {
	none: "",
	sm: "rounded-sm",
	md: "rounded-md",
	lg: "rounded-lg",
	full: "rounded-full",
};

/** Pulse placeholder block — use inside layouts that mirror loaded content. */
export function Skeleton({ className, rounded = "md" }: SkeletonProps) {
	return (
		<div
			className={cn("animate-pulse bg-neutral-200 dark:bg-neutral-700/80", ROUNDED[rounded], className)}
			aria-hidden
		/>
	);
}

export function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
	if (lines <= 1) {
		return <Skeleton className={cn("h-4 w-full max-w-md", className)} />;
	}
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					className={cn("h-4", i === lines - 1 ? "w-3/5" : "w-full")}
				/>
			))}
		</div>
	);
}
