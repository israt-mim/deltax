export interface Team {
	id: string;
	name: string;
	description: string;
	numberOfUsers: number;
	/** Server-generated slug for the backing group (teams API). */
	groupTechnicalName?: string;
	createdAt: string;
	updatedAt: string;
}
