export interface FieldRow {
	id: number;
	name: string;
	group: string;
	groupTechnicalName: string;
	context: string;
	type: string;
	dataType: string;
	tags: string[];
}

const FIELD_NAMES = [
	"Modification Number", "Spring", "test", "Masterdata field", "other master field",
	"Required test 2", "Required test", "Expense Reimbursement Budget",
	"Estimated Expense Amount", "Expense Type", "Hourly Rate", "Estimated Hours",
	"Labor Category", "Contract Value", "Period of Performance", "Award Date",
	"Vendor Name", "Invoice Number", "Payment Terms", "Billing Address",
];

const GROUPS = [
	"Modification Number", "Division", "Master Contract Number", "Master Contract Category",
	"Customer Contract Number", "Sales Document Type", "Expense Reimbursement Budget",
	"Estimated Expense Amount", "Expense Type", "Hourly Rate", "Estimated Hours", "Labor Category",
];

const TECH_NAMES = [
	"modification_number", "division", "master_contract_number", "master_contract_category",
	"customer_contract_number", "sales_document_type", "expense_reimbursement_budget",
	"estimated_expense_amount", "expense_type", "hourly_rate", "estimated_hours", "labor_category",
];

const CONTEXTS = [
	"Sales - Contracts - Sales - Cont...", "Global",
	"Public Sector - Projects - Task ...",
];

const TYPES = ["Header", "Generic", "Line-Item"];
const DATA_TYPES = ["S", "C", "N"];
const TAGS_POOL = ["YOLOBS", "REQUIRED", "CUSTOM", "SYSTEM"];

function randomItem<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function generateFields(count: number, startId = 1): FieldRow[] {
	return Array.from({ length: count }, (_, i) => {
		const id = startId + i;
		const nameIdx = i % FIELD_NAMES.length;
		const groupIdx = i % GROUPS.length;
		const hasTags = Math.random() > 0.8;
		return {
			id,
			name: FIELD_NAMES[nameIdx],
			group: GROUPS[groupIdx],
			groupTechnicalName: TECH_NAMES[groupIdx],
			context: randomItem(CONTEXTS),
			type: randomItem(TYPES),
			dataType: randomItem(DATA_TYPES),
			tags: hasTags ? [randomItem(TAGS_POOL)] : [],
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
