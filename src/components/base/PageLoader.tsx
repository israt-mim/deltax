import { motion } from "framer-motion";
import cn from "classnames";

const LOGO_SRC = new URL("../../assets/logo.svg", import.meta.url).href;

export interface PageLoaderProps {
	/** Light screen (default) or match dark surfaces (e.g. login). */
	variant?: "light" | "dark";
	/** Full viewport splash vs. content area under navbar/sidebar. */
	mode?: "fullscreen" | "embedded";
	/** Smaller logo and bar for cards / inline rows (only applies with `mode="embedded"`). */
	compact?: boolean;
	className?: string;
}

/**
 * Centered DeltaX logo with a thin indeterminate progress bar (splash / session bootstrap).
 */
export function PageLoader({
	variant = "light",
	mode = "fullscreen",
	compact = false,
	className,
}: PageLoaderProps) {
	const isLight = variant === "light";
	const embedded = mode === "embedded";

	const shell = embedded
		? cn(
				"flex flex-col items-center justify-center",
				compact ? "gap-3 px-2 py-2" : "gap-6 px-6 py-10",
				className
			)
		: cn(
				"flex min-h-screen flex-col items-center justify-center gap-8 px-6",
				isLight ? "bg-white" : "bg-[#050810]",
				className
			);

	const imgClass = cn(
		"shrink-0 object-contain",
		compact ? "h-8 w-8" : "h-14 w-14 sm:h-16 sm:w-16"
	);

	const barWrapClass = cn(
		"relative overflow-hidden rounded-full",
		compact ? "h-0.5 w-28 max-w-full" : "h-1 w-40 max-w-[min(100%,16rem)]",
		isLight ? "bg-neutral-200" : "bg-white/10"
	);

	return (
		<div className={shell} aria-busy="true" aria-live="polite" aria-label="Loading">
			<img src={LOGO_SRC} alt="" width={compact ? 32 : 50} height={compact ? 32 : 50} className={imgClass} decoding="async" />
			<div className={barWrapClass}>
				<motion.div
					className="absolute inset-y-0 w-[28%] rounded-full bg-teal-500"
					initial={{ left: "-28%" }}
					animate={{ left: ["-28%", "100%"] }}
					transition={{
						duration: 1.4,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
						repeatDelay: 0.15,
					}}
				/>
			</div>
		</div>
	);
}
