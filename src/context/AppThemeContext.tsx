import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import type { AppThemeName } from "../constants/appThemes";
import {
	readAppThemePreferences,
	writeAppThemePreferences,
	type AppearanceMode,
	type AppThemePreferences,
} from "../lib/appThemeStorage";
import { applyAppearanceMode, applyAppThemeColor } from "../lib/theme";

export type AppThemeContextValue = {
	theme: AppThemeName;
	mode: AppearanceMode;
	isDark: boolean;
	setTheme: (theme: AppThemeName) => void;
	setMode: (mode: AppearanceMode) => void;
	setPreferences: (preferences: AppThemePreferences) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function applyPreferences(preferences: AppThemePreferences) {
	applyAppThemeColor(preferences.theme);
	applyAppearanceMode(preferences.mode);
}

/** Apply stored theme + mode before React mounts (avoids flash). */
export function initAppThemeFromStorage() {
	const preferences = readAppThemePreferences();
	applyPreferences(preferences);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
	const [preferences, setPreferencesState] = useState(readAppThemePreferences);
	const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
		typeof window !== "undefined"
			? window.matchMedia("(prefers-color-scheme: dark)").matches
			: false
	);

	const isDark =
		preferences.mode === "dark"
			? true
			: preferences.mode === "light"
				? false
				: systemPrefersDark;

	useEffect(() => {
		applyPreferences(preferences);
		writeAppThemePreferences(preferences);
	}, [preferences]);

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => {
			setSystemPrefersDark(media.matches);
			if (preferences.mode === "system") {
				applyAppearanceMode("system");
			}
		};
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [preferences.mode]);

	const setTheme = useCallback((theme: AppThemeName) => {
		setPreferencesState((prev) => ({ ...prev, theme }));
	}, []);

	const setMode = useCallback((mode: AppearanceMode) => {
		setPreferencesState((prev) => ({ ...prev, mode }));
	}, []);

	const setPreferences = useCallback((next: AppThemePreferences) => {
		setPreferencesState(next);
	}, []);

	const value = useMemo<AppThemeContextValue>(
		() => ({
			theme: preferences.theme,
			mode: preferences.mode,
			isDark,
			setTheme,
			setMode,
			setPreferences,
		}),
		[preferences.theme, preferences.mode, isDark, setTheme, setMode, setPreferences]
	);

	const antdThemeConfig = useMemo(
		() => ({
			algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
			token: {
				colorBgContainer: isDark ? "#141414" : undefined,
				colorBgElevated: isDark ? "#141414" : undefined,
				colorBorder: isDark ? "#262626" : undefined,
				colorText: isDark ? "#f5f5f5" : undefined,
				colorTextSecondary: isDark ? "#a3a3a3" : undefined,
			},
		}),
		[isDark]
	);

	return (
		<ConfigProvider theme={antdThemeConfig}>
			<AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
		</ConfigProvider>
	);
}

export function useAppTheme(): AppThemeContextValue {
	const ctx = useContext(AppThemeContext);
	if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
	return ctx;
}
