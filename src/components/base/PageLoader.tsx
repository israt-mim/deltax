import { motion } from "framer-motion";

const LOGO_SRC = new URL("../../assets/logo.svg", import.meta.url).href;

export interface PageLoaderProps {
	/** Light screen (default) or match dark surfaces (e.g. login). */
	variant?: "light" | "dark";
	/** Full viewport splash vs. content area under navbar/sidebar. */
	mode?: "fullscreen" | "embedded";
	className?: string;
}

/**
 * Centered DeltaX logo with a thin indeterminate progress bar (splash / session bootstrap).
 */
export function PageLoader({ variant = "light", mode = "fullscreen", className }: PageLoaderProps) {
	const isLight = variant === "light";
	const embedded = mode === "embedded";

	const shell = embedded
		? `flex flex-col items-center justify-center gap-6 px-6 py-10 ${className ?? ""}`
		: isLight
			? `flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6 ${className ?? ""}`
			: `flex min-h-screen flex-col items-center justify-center gap-8 bg-[#050810] px-6 ${className ?? ""}`;

	return (
		<div className={shell} aria-busy="true" aria-live="polite" aria-label="Loading">
			<img
				src={LOGO_SRC}
				alt=""
				width={50}
				height={50}
				className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
				decoding="async"
			/>
			<div
				className={
					isLight
						? "relative h-1 w-40 max-w-[min(100%,16rem)] overflow-hidden rounded-full bg-neutral-200"
						: "relative h-1 w-40 max-w-[min(100%,16rem)] overflow-hidden rounded-full bg-white/10"
				}
			>
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
