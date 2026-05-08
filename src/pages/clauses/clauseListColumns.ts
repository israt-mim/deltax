/**
 * Scrollable list columns for GET /api/clauses (flattened row).
 * Order: general identity → dates/tags → GSA → flowdown booleans.
 */
export const CLAUSE_SCROLL_COLUMN_SPECS: {
	id: string;
	header: string;
	width: number;
	minWidth?: number;
	/** TanStack maxSize — keep long-text columns from absorbing stretched table width. */
	maxSize?: number;
}[] = [
	{ id: "displayId", header: "Display ID", width: 168, minWidth: 120 },
	{ id: "number", header: "Number", width: 132, minWidth: 100 },
	{ id: "title", header: "Title", width: 200, minWidth: 160, maxSize: 360 },
	{ id: "description", header: "Description", width: 200, minWidth: 140, maxSize: 320 },
	{ id: "text", header: "Text", width: 200, minWidth: 160, maxSize: 320 },
	{ id: "category", header: "Category", width: 130, minWidth: 100 },
	{ id: "subcategory", header: "Subcategory", width: 140, minWidth: 100 },
	{ id: "language", header: "Language", width: 100, minWidth: 80 },
	{ id: "documentType", header: "Document type", width: 168, minWidth: 120 },
	{ id: "reference", header: "Reference", width: 120, minWidth: 90 },
	{ id: "deviation", header: "Deviation", width: 100, minWidth: 80 },
	{ id: "version", header: "Version", width: 80, minWidth: 64 },
	{ id: "validFrom", header: "Valid from", width: 190, minWidth: 160 },
	{ id: "validTo", header: "Valid to", width: 190, minWidth: 160 },
	{ id: "tags", header: "Tags", width: 340, minWidth: 240 },
	{ id: "createdAt", header: "Created", width: 210, minWidth: 180 },
	{ id: "updatedAt", header: "Updated", width: 210, minWidth: 180 },
	{ id: "__v", header: "__v", width: 56, minWidth: 48 },
	{ id: "pOrC", header: "P or C", width: 72, minWidth: 56 },
	{ id: "ibr", header: "IBR", width: 64, minWidth: 52 },
	{ id: "usaceCsi", header: "USACE CSI", width: 100, minWidth: 80 },
	{ id: "ucf", header: "UCF", width: 56, minWidth: 44 },
	{ id: "fp", header: "FP", width: 52, minWidth: 44 },
	{ id: "cr", header: "CR", width: 52, minWidth: 44 },
	{ id: "tmLh", header: "TM/LH", width: 64, minWidth: 52 },
	{ id: "sup", header: "SUP", width: 52, minWidth: 44 },
	{ id: "svc", header: "SVC", width: 52, minWidth: 44 },
	{ id: "rAndD", header: "R&D", width: 56, minWidth: 44 },
	{ id: "con", header: "CON", width: 52, minWidth: 44 },
	{ id: "lmv", header: "LMV", width: 52, minWidth: 44 },
	{ id: "comSvc", header: "Com Svc", width: 72, minWidth: 56 },
	{ id: "ddr", header: "DDR", width: 52, minWidth: 44 },
	{ id: "aE", header: "A/E", width: 52, minWidth: 44 },
	{ id: "salesOrder", header: "Sales order", width: 96, minWidth: 80 },
	{ id: "schedulingAgreement", header: "Scheduling agr.", width: 112, minWidth: 88 },
	{ id: "wbs", header: "WBS", width: 72, minWidth: 56 },
	{ id: "flowToPurchasingContract", header: "Flow → purch. contract", width: 140, minWidth: 100 },
	{ id: "printOnRfq", header: "Print on RFQ", width: 104, minWidth: 80 },
	{ id: "equipment", header: "Equipment", width: 96, minWidth: 72 },
	{ id: "delivery", header: "Delivery", width: 88, minWidth: 72 },
	{ id: "purchaseRequisition", header: "Purch. requisition", width: 120, minWidth: 96 },
	{ id: "billingDocument", header: "Billing document", width: 120, minWidth: 96 },
	{ id: "printOnPurchasingContract", header: "Print on purch. contract", width: 140, minWidth: 100 },
	{ id: "flowToInspectionLot", header: "Flow → inspection lot", width: 132, minWidth: 100 },
	{ id: "serviceNotification", header: "Service notif.", width: 112, minWidth: 88 },
	{ id: "productionOrder", header: "Production order", width: 120, minWidth: 96 },
	{ id: "purchaseOrder", header: "Purchase order", width: 120, minWidth: 96 },
	{ id: "accountingDocument", header: "Accounting document", width: 132, minWidth: 100 },
	{ id: "flowToRfq", header: "Flow to RFQ", width: 100, minWidth: 80 },
	{ id: "printOnInspectionLot", header: "Print on insp. lot", width: 120, minWidth: 96 },
	{ id: "serviceOrder", header: "Service order", width: 108, minWidth: 88 },
];
