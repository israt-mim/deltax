import { APP_THEME_PALETTE, type AppThemeName } from "../constants/appThemes";

const PRIMARY_SCALE_KEYS = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 975] as const;

type PrimaryScaleKey = (typeof PRIMARY_SCALE_KEYS)[number];

/** Lightness steps for primary scale (tuned for stronger contrast between shades). */
const LIGHTNESS_BY_KEY: Record<PrimaryScaleKey, number> = {
	50: 0.96,
	100: 0.9,
	150: 0.84,
	200: 0.76,
	300: 0.64,
	400: 0.54,
	500: 0.46,
	600: 0.38,
	700: 0.32,
	800: 0.26,
	850: 0.22,
	900: 0.18,
	950: 0.13,
	975: 0.09,
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const normalized = hex.replace("#", "");
	const value =
		normalized.length === 3
			? normalized
					.split("")
					.map((c) => c + c)
					.join("")
			: normalized;
	const num = Number.parseInt(value, 16);
	return {
		r: (num >> 16) & 255,
		g: (num >> 8) & 255,
		b: num & 255,
	};
}

function rgbToHex(r: number, g: number, b: number): string {
	return `#${[r, g, b]
		.map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0"))
		.join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case rn:
				h = (gn - bn) / d + (gn < bn ? 6 : 0);
				break;
			case gn:
				h = (bn - rn) / d + 2;
				break;
			default:
				h = (rn - gn) / d + 4;
				break;
		}
		h /= 6;
	}

	return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	const sn = s / 100;
	const ln = l / 100;
	const c = (1 - Math.abs(2 * ln - 1)) * sn;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = ln - c / 2;
	let rp = 0;
	let gp = 0;
	let bp = 0;

	if (h < 60) {
		rp = c;
		gp = x;
	} else if (h < 120) {
		rp = x;
		gp = c;
	} else if (h < 180) {
		gp = c;
		bp = x;
	} else if (h < 240) {
		gp = x;
		bp = c;
	} else if (h < 300) {
		rp = x;
		bp = c;
	} else {
		rp = c;
		bp = x;
	}

	return {
		r: (rp + m) * 255,
		g: (gp + m) * 255,
		b: (bp + m) * 255,
	};
}

export function generatePrimaryScale(baseHex: string): Record<PrimaryScaleKey, string> {
	const { r, g, b } = hexToRgb(baseHex);
	const { h, s } = rgbToHsl(r, g, b);
	const scale = {} as Record<PrimaryScaleKey, string>;
	const baseSaturation = clamp(s, 18, 92);

	for (const key of PRIMARY_SCALE_KEYS) {
		if (key === 500) {
			scale[500] = baseHex;
			continue;
		}
		const targetL = LIGHTNESS_BY_KEY[key] * 100;
		const satBoost = key <= 300 ? 1.06 : key >= 700 ? 0.9 : 1;
		const saturation = clamp(baseSaturation * satBoost, 12, 96);
		const { r: nr, g: ng, b: nb } = hslToRgb(h, saturation, targetL);
		scale[key] = rgbToHex(nr, ng, nb);
	}

	return scale;
}

export function applyAppThemeColor(themeName: AppThemeName): void {
	const { base } = APP_THEME_PALETTE[themeName];
	const scale = generatePrimaryScale(base);
	const root = document.documentElement;

	for (const key of PRIMARY_SCALE_KEYS) {
		root.style.setProperty(`--color-bluegray-${key}`, scale[key]);
	}

	root.dataset.appTheme = themeName;
}

/** @deprecated Use applyAppThemeColor — kept for compatibility. */
export function setPrimaryColor(hex: string) {
	const scale = generatePrimaryScale(hex);
	const root = document.documentElement;
	for (const key of PRIMARY_SCALE_KEYS) {
		root.style.setProperty(`--color-bluegray-${key}`, scale[key]);
	}
}

export function resolveDarkMode(mode: "light" | "dark" | "system"): boolean {
	if (mode === "dark") return true;
	if (mode === "light") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyAppearanceMode(mode: "light" | "dark" | "system"): void {
	document.documentElement.classList.toggle("dark", resolveDarkMode(mode));
	document.documentElement.dataset.appearanceMode = mode;
}

/** Read a theme CSS variable from `:root` (set by `applyAppThemeColor`). */
export function getThemeCssColor(cssVar: string, fallback: string): string {
	if (typeof document === "undefined") return fallback;
	const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
	return value || fallback;
}

const CHART_PRIMARY_FALLBACK: Record<500 | 600 | 700, string> = {
	500: "#326080",
	600: "#2C5572",
	700: "#254760",
};

/** Primary brand color for charts (tracks theme picker / `primary-500`). */
export function getChartPrimaryColor(shade: 500 | 600 | 700 = 500): string {
	return getThemeCssColor(`--color-bluegray-${shade}`, CHART_PRIMARY_FALLBACK[shade]);
}
