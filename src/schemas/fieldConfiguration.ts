/** Table row for Fields list (GET /api/fields). */
export interface FieldRow {
	id: string;
	name: string;
	group: string;
	groupTechnicalName: string;
	context: string;
	type: string;
	dataType: string;
	tags: string[];
}
