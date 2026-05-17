import {
	DEFAULT_APP_THEME_NAME,
	isAppThemeName,
	type AppThemeName,
} from "../constants/appThemes";

export const APP_THEME_PREFERENCES_STORAGE_KEY = "deltax-app-preferences";
const LEGACY_DARK_MODE_STORAGE_KEY = "deltax-theme";

export type AppearanceMode = "light" | "dark" | "system";

export type AppThemePreferences = {
	/** Color theme name only (e.g. Mint, Azure). */
	theme: AppThemeName;
	/** Light, dark, or follow system preference. */
	mode: AppearanceMode;
};

export const DEFAULT_APP_THEME_PREFERENCES: AppThemePreferences = {
	theme: DEFAULT_APP_THEME_NAME,
	mode: "system",
};

function parseMode(value: string | null): AppearanceMode | null {
	if (value === "light" || value === "dark" || value === "system") return value;
	return null;
}

export function readAppThemePreferences(): AppThemePreferences {
	if (typeof window === "undefined") return DEFAULT_APP_THEME_PREFERENCES;

	try {
		const raw = localStorage.getItem(APP_THEME_PREFERENCES_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<AppThemePreferences>;
			const theme =
				typeof parsed.theme === "string" && isAppThemeName(parsed.theme)
					? parsed.theme
					: DEFAULT_APP_THEME_NAME;
			const mode = parseMode(parsed.mode ?? null) ?? DEFAULT_APP_THEME_PREFERENCES.mode;
			return { theme, mode };
		}
	} catch {
		/* fall through to legacy */
	}

	const legacy = localStorage.getItem(LEGACY_DARK_MODE_STORAGE_KEY);
	if (legacy === "dark") return { theme: DEFAULT_APP_THEME_NAME, mode: "dark" };
	if (legacy === "light") return { theme: DEFAULT_APP_THEME_NAME, mode: "light" };

	return DEFAULT_APP_THEME_PREFERENCES;
}

export function writeAppThemePreferences(preferences: AppThemePreferences): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(APP_THEME_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
