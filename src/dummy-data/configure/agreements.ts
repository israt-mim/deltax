export interface AgreementRow {
	id: number;
	name: string;
	category: string;
	status: string;
	owner: string;
	createdDate: string;
	expiryDate: string;
	tags: string[];
}

const AGREEMENT_NAMES = [
	"Master Service Agreement", "Non-Disclosure Agreement", "Service Level Agreement",
	"Purchase Order", "Lease Agreement", "Vendor Agreement", "Employment Contract",
	"Consulting Agreement", "License Agreement", "Distribution Agreement",
	"Partnership Agreement", "Subcontractor Agreement", "Maintenance Agreement",
	"Software License", "Data Processing Agreement", "Supply Agreement",
];

const CATEGORIES = [
	"Sales", "Procurement", "HR", "Legal", "Finance", "Operations", "IT", "Marketing",
];

const STATUSES = ["Active", "Draft", "Expired", "Under Review", "Pending Approval"];

const OWNERS = [
	"John Smith", "Sarah Johnson", "Michael Chen", "Emily Davis", "Robert Wilson",
	"Jessica Brown", "David Lee", "Amanda Taylor", "Chris Martinez", "Laura Anderson",
];

const TAGS_POOL = ["URGENT", "RENEWAL", "HIGH-VALUE", "STANDARD", "CUSTOM"];

function randomItem<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number): string {
	const d = new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function generateAgreements(count: number, startId = 1): AgreementRow[] {
	return Array.from({ length: count }, (_, i) => {
		const id = startId + i;
		const hasTags = Math.random() > 0.75;
		return {
			id,
			name: AGREEMENT_NAMES[i % AGREEMENT_NAMES.length],
			category: randomItem(CATEGORIES),
			status: randomItem(STATUSES),
			owner: randomItem(OWNERS),
			createdDate: randomDate(730),
			expiryDate: randomDate(-365),
			tags: hasTags ? [randomItem(TAGS_POOL)] : [],
		};
	});
}

const TOTAL_AGREEMENTS = 500;
export const allAgreementRows = generateAgreements(TOTAL_AGREEMENTS);

export const PAGE_SIZE = 30;

export function fetchAgreementsPage(page: number): Promise<{ data: AgreementRow[]; hasMore: boolean }> {
	return new Promise((resolve) => {
		setTimeout(() => {
			const start = page * PAGE_SIZE;
			const data = allAgreementRows.slice(start, start + PAGE_SIZE);
			resolve({ data, hasMore: start + PAGE_SIZE < TOTAL_AGREEMENTS });
		}, 400);
	});
}
