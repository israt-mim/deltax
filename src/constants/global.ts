export const NAVBAR_HEIGHT = 48;
export const SIDEBAR_WIDTH = 52;
export const EXPANDED_SIDEBAR_WIDTH = 220;

/** Minimum table viewport height (empty state and short lists). */
export const TABLE_MIN_HEIGHT_PX = 420;

/** Maximum table viewport height before the body scrolls. */
export const TABLE_MAX_HEIGHT_CSS = "min(630px, calc(100vh - 240px))";

/** Empty-state body area inside a table (shell min height minus ~header). */
export const TABLE_EMPTY_BODY_MIN_HEIGHT_PX = 354;

/** Bordered scroll wrapper for plain HTML tables. */
export const TABLE_SHELL_CLASS =
	"data-table-shell overflow-auto rounded-lg border border-neutral-200 dark:border-black-600";

/** Empty / error message cell inside a table body. */
export const TABLE_EMPTY_CELL_CLASS = "data-table-empty-cell";
