import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "deltax-theme";

function readStoredDarkMode(): boolean {
	if (typeof window === "undefined") return false;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "dark") return true;
	if (stored === "light") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyDarkMode(enabled: boolean) {
	document.documentElement.classList.toggle("dark", enabled);
}

/** Call once before React mounts to avoid theme flash. */
export function initDarkModeFromStorage() {
	applyDarkMode(readStoredDarkMode());
}

export function useDarkMode() {
	const [isDark, setIsDark] = useState(readStoredDarkMode);

	useEffect(() => {
		applyDarkMode(isDark);
		localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
	}, [isDark]);

	const toggle = useCallback(() => {
		setIsDark((prev) => !prev);
	}, []);

	return { isDark, setIsDark, toggle };
}
