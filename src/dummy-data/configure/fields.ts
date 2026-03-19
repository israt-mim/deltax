export interface FieldRow {
	id: number;
	name: string;
	type: string;
	agreement: string;
	required: boolean;
	createdAt: string;
}

const FIELD_TYPES = ["Text", "Number", "Date", "Dropdown", "Checkbox", "Email", "Currency", "Percentage", "Textarea", "Phone"];
const AGREEMENTS = ["Master Agreement", "Service Agreement", "NDA", "SLA", "Purchase Order", "Lease Agreement"];

function randomItem<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function generateFields(count: number, startId = 1): FieldRow[] {
	return Array.from({ length: count }, (_, i) => {
		const id = startId + i;
		return {
			id,
			name: `Field ${id}`,
			type: randomItem(FIELD_TYPES),
			agreement: randomItem(AGREEMENTS),
			required: Math.random() > 0.5,
			createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
		};
	});
}

const TOTAL_FIELDS = 500;
export const allFieldRows = generateFields(TOTAL_FIELDS);

export const PAGE_SIZE = 30;

export function fetchFieldsPage(page: number): Promise<{ data: FieldRow[]; hasMore: boolean }> {
	return new Promise((resolve) => {
		setTimeout(() => {
			const start = page * PAGE_SIZE;
			const data = allFieldRows.slice(start, start + PAGE_SIZE);
			resolve({ data, hasMore: start + PAGE_SIZE < TOTAL_FIELDS });
		}, 400);
	});
}
