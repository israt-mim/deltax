/** Named app color themes. Only the theme name is persisted (localStorage / future API). */
export const APP_THEME_NAMES = [
	"Eclipse",
	"Indigo",
	"Azure",
	"Cyan",
	"Mint",
	"Aqua",
	"Emerald",
	"Olive",
	"Graphite",
	"Sand",
	"Gold",
	"Amber",
	"Coral",
	"Rose",
	"Magenta",
	"Nova",
	"Neo",
	"Cobalt",
	"Silver",
	"Electric Moss",
	"Pulse",
] as const;

export type AppThemeName = (typeof APP_THEME_NAMES)[number];

export const DEFAULT_APP_THEME_NAME: AppThemeName = "Azure";

/** Lighter (top-left) and darker (bottom-right) swatch halves + base for UI palette generation. */
export type AppThemeShades = {
	light: string;
	dark: string;
	/** Primary brand tone (maps to primary-500). */
	base: string;
};

/** fillLight / fillDark / color — aligned with design-system AccentColor picker. */
export const APP_THEME_PALETTE: Record<AppThemeName, AppThemeShades> = {
	Eclipse: { light: "#3C1A82", dark: "#2D1461", base: "#3C1A82" },
	Indigo: { light: "#292E92", dark: "#202472", base: "#292E92" },
	Azure: { light: "#0077E3", dark: "#0054A1", base: "#0077E3" },
	Cyan: { light: "#06B6D4", dark: "#0892AA", base: "#06B6D4" },
	Mint: { light: "#348D8A", dark: "#286E6C", base: "#348D8A" },
	Aqua: { light: "#4ECDC4", dark: "#36A9A2", base: "#4ECDC4" },
	Emerald: { light: "#3DA95F", dark: "#2F8448", base: "#3DA95F" },
	Olive: { light: "#789262", dark: "#5F734D", base: "#789262" },
	Graphite: { light: "#6D6D6D", dark: "#555555", base: "#6D6D6D" },
	Sand: { light: "#D4A373", dark: "#A88058", base: "#D4A373" },
	Gold: { light: "#E8BB44", dark: "#B59235", base: "#E8BB44" },
	Amber: { light: "#E38715", dark: "#B16910", base: "#E38715" },
	Coral: { light: "#FF7A5C", dark: "#E65A3B", base: "#FF7A5C" },
	Rose: { light: "#CB4C78", dark: "#9E3B5E", base: "#CB4C78" },
	Magenta: { light: "#B83288", dark: "#962A6F", base: "#B83288" },
	Nova: { light: "#3558F2", dark: "#2842C6", base: "#3558F2" },
	Neo: { light: "#805FEA", dark: "#6548C3", base: "#805FEA" },
	Cobalt: { light: "#3C67A7", dark: "#32578D", base: "#3C67A7" },
	Silver: { light: "#6A6A93", dark: "#545476", base: "#6A6A93" },
	"Electric Moss": { light: "#46B859", dark: "#368F46", base: "#46B859" },
	Pulse: { light: "#0094FF", dark: "#0075CC", base: "#0094FF" },
};

/** @deprecated Use APP_THEME_PALETTE[name].base — kept for compatibility. */
export const APP_THEME_SWATCHES: Record<AppThemeName, string> = Object.fromEntries(
	APP_THEME_NAMES.map((name) => [name, APP_THEME_PALETTE[name].base])
) as Record<AppThemeName, string>;

export function getThemeShades(name: AppThemeName): AppThemeShades {
	return APP_THEME_PALETTE[name];
}

export function isAppThemeName(value: string): value is AppThemeName {
	return (APP_THEME_NAMES as readonly string[]).includes(value);
}
