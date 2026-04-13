/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** API origin (no trailing slash). Omit for same-origin requests (use Vite `/api` proxy). */
	readonly VITE_API_BASE_URL?: string;
	/** Backend origin for Vite dev server proxy (`vite.config`); defaults in config if unset. */
	readonly VITE_DEV_API_PROXY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
