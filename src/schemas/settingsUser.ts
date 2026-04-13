export interface SettingsUser {
	id: string;
	displayName: string;
	email: string;
	role: string;
	createdAt: string;
}

/** Flattened row for the users list table (GET /api/users). */
export interface SettingsUserListRow {
	id: string;
	displayName: string;
	/** From API when present (edit form). */
	firstName?: string;
	lastName?: string;
	username: string;
	email: string;
	groupName: string;
	teamsSummary: string;
	/** Group ObjectId when API populates `group` or passes an id string. */
	groupId?: string;
	/** Team ObjectIds when API populates `teams`. */
	teamIds?: string[];
	role: string;
	createdAt: string;
}
