import type { AppThemeShades } from "../../constants/appThemes";

type ThemeSwatchProps = {
	shades: AppThemeShades;
	size?: "sm" | "md";
	className?: string;
};

const SIZE_CLASS = {
	sm: "h-4 w-4",
	md: "h-10 w-10",
} as const;

/** Two-tone circle swatch (light top-left, dark bottom-right). */
export function ThemeSwatch({ shades, size = "md", className = "" }: ThemeSwatchProps) {
	return (
		<span
			className={`block shrink-0 rounded-full border border-black/10 dark:border-white/15 ${SIZE_CLASS[size]} ${className}`}
			style={{
				background: `linear-gradient(135deg, ${shades.light} 0%, ${shades.light} 50%, ${shades.dark} 50%, ${shades.dark} 100%)`,
			}}
		/>
	);
}
