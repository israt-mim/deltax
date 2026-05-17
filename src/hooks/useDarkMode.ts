import { useAppTheme } from "../context/AppThemeContext";

/** Backward-compatible hook; appearance is managed by AppThemeProvider. */
export function useDarkMode() {
	const { isDark, mode, setMode } = useAppTheme();

	return {
		isDark,
		setIsDark: (enabled: boolean) => setMode(enabled ? "dark" : "light"),
		toggle: () => setMode(isDark ? "light" : "dark"),
		mode,
		setMode,
	};
}

export { initAppThemeFromStorage } from "../context/AppThemeContext";
