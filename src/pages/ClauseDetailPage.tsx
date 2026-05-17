import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import cn from "classnames";
import { ApiError, useClauseDetailQuery } from "../api";
import type { ClauseDetailApi, ClauseSectionFields } from "../api/services/clauses";
import { formatUsDateTime } from "../lib/formatDateTime";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { PageLoader } from "../components/base/PageLoader";
import { Title } from "../components/base/Title";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";

const LONG_TEXT_THRESHOLD = 200;

type GridCell = {
	label: string;
	node: ReactNode;
};

function strVal(v: unknown): string {
	if (v === null || v === undefined) return "";
	if (typeof v === "boolean") return v ? "Yes" : "No";
	if (typeof v === "number") return String(v);
	return String(v).trim();
}

function formatMaybeDate(iso: unknown): string {
	if (typeof iso !== "string" || !iso.trim()) return "—";
	const formatted = formatUsDateTime(iso);
	return formatted || "—";
}

function ExpandableText({ text }: { text: string }) {
	const [open, setOpen] = useState(false);
	const trimmed = text.trim();
	if (!trimmed) return <span className="text-neutral-400">—</span>;
	const long = trimmed.length > LONG_TEXT_THRESHOLD;
	return (
		<div className="min-w-0">
			<p className={cn("text-sm text-neutral-900 dark:text-neutral-100", !open && long && "line-clamp-3")}>
				{trimmed}
			</p>
			{long && (
				<button
					type="button"
					className="mt-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
					onClick={() => setOpen((o) => !o)}
				>
					{open ? "Show less" : "Show more"}
				</button>
			)}
		</div>
	);
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="min-w-0">
			<div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
				{label}
			</div>
			<div className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">{children}</div>
		</div>
	);
}

function cell(label: string, node: ReactNode): GridCell {
	return { label, node };
}

function CollapsibleSection({
	title,
	defaultOpen = true,
	children,
}: {
	title: string;
	defaultOpen?: boolean;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<Card className="overflow-hidden border border-neutral-200 p-0 shadow-sm dark:border-black-600">
			<button
				type="button"
				className="flex w-full items-center justify-between gap-2 bg-neutral-100 px-4 py-3 text-left transition-colors hover:bg-neutral-200/80 dark:bg-black-700 dark:hover:bg-black-600"
				onClick={() => setOpen((o) => !o)}
				aria-expanded={open}
			>
				<span className="text-xs font-semibold tracking-wide text-neutral-700 dark:text-neutral-200">
					{title}
				</span>
				<ExpandMoreOutlinedIcon
					sx={{ fontSize: 20 }}
					className={cn("shrink-0 text-neutral-500 transition-transform", open && "rotate-180")}
				/>
			</button>
			{open && <div className="border-t border-neutral-200 p-4 dark:border-black-600">{children}</div>}
		</Card>
	);
}

function ThreeColumnGrid({ rows }: { rows: (GridCell | null)[][] }) {
	return (
		<div className="flex flex-col gap-6">
			{rows.map((cols, ri) => (
				<div
					key={ri}
					className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
				>
					{cols.map((c, ci) => (
						<div key={ci} className="min-w-0">
							{c ? <FieldBlock label={c.label}>{c.node}</FieldBlock> : null}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

function buildGeneralRows(
	g: ClauseSectionFields | undefined,
	displayId: string
): (GridCell | null)[][] {
	const d = g ?? {};
	const val = (k: string) => strVal(d[k]);
	return [
		[
			cell("ID", <span className="break-all">{displayId}</span>),
			cell("Number", val("number") || "—"),
			cell("Title", val("title") || "—"),
		],
		[
			cell("Description", <ExpandableText text={val("description")} />),
			cell("Text", <ExpandableText text={val("text")} />),
			null,
		],
		[
			cell("Valid To", formatMaybeDate(d["validTo"])),
			cell("Category", val("category") || "—"),
			cell("Valid From", formatMaybeDate(d["validFrom"])),
		],
		[
			cell("Language", val("language") || "—"),
			cell("Type", val("documentType") || "—"),
			cell("Subcategory", val("subcategory") || "—"),
		],
		[
			cell("Deviation", val("deviation") || "—"),
			null,
			cell("Reference", val("reference") || "—"),
		],
	];
}

const GSA_KEYS = [
	"pOrC",
	"ibr",
	"usaceCsi",
	"ucf",
	"fp",
	"cr",
	"tmLh",
	"sup",
	"svc",
	"rAndD",
	"con",
	"lmv",
	"comSvc",
	"ddr",
	"aE",
] as const;

const GSA_LABELS: Record<string, string> = {
	pOrC: "P or C",
	ibr: "IBR",
	usaceCsi: "USACE CSI",
	ucf: "UCF",
	fp: "FP",
	cr: "CR",
	tmLh: "T&M LH",
	sup: "SUP",
	svc: "SVC",
	rAndD: "R&D",
	con: "CON",
	lmv: "LMV",
	comSvc: "COM SVC",
	ddr: "DDR",
	aE: "A-E",
};

function buildGsaRows(f: ClauseSectionFields | undefined): (GridCell | null)[][] {
	const o = f ?? {};
	const cells: GridCell[] = GSA_KEYS.map((k) => {
		const raw = strVal(o[k]);
		const label = GSA_LABELS[k] ?? k;
		return cell(label, raw || "—");
	});
	const rows: (GridCell | null)[][] = [];
	for (let i = 0; i < cells.length; i += 3) {
		rows.push([cells[i] ?? null, cells[i + 1] ?? null, cells[i + 2] ?? null]);
	}
	return rows;
}

const FLOWDOWN_KEYS = [
	"salesOrder",
	"schedulingAgreement",
	"wbs",
	"flowToPurchasingContract",
	"printOnRfq",
	"equipment",
	"delivery",
	"purchaseRequisition",
	"billingDocument",
	"printOnPurchasingContract",
	"flowToInspectionLot",
	"serviceNotification",
	"productionOrder",
	"purchaseOrder",
	"accountingDocument",
	"flowToRfq",
	"printOnInspectionLot",
	"serviceOrder",
] as const;

function humanizeFlowdownKey(key: string): string {
	return key
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (s) => s.toUpperCase())
		.trim();
}

function buildFlowdownRows(f: ClauseSectionFields | undefined): (GridCell | null)[][] {
	const o = f ?? {};
	const cells: GridCell[] = FLOWDOWN_KEYS.map((k) => {
		const v = o[k];
		const raw = strVal(v);
		const label = humanizeFlowdownKey(k);
		return cell(label, raw || "—");
	});
	const rows: (GridCell | null)[][] = [];
	for (let i = 0; i < cells.length; i += 3) {
		rows.push([cells[i] ?? null, cells[i + 1] ?? null, cells[i + 2] ?? null]);
	}
	return rows;
}

function TagsRow({ tags }: { tags: string[] | undefined }) {
	if (!tags?.length) return null;
	return (
		<div className="flex flex-wrap gap-1.5">
			{tags.map((t) => (
				<span
					key={t}
					className="rounded-full bg-warning-100 px-2.5 py-0.5 text-xs font-medium text-warning-800 dark:bg-warning-900 dark:text-warning-200"
				>
					{t}
				</span>
			))}
		</div>
	);
}

function StatusPill({ active }: { active: boolean | undefined }) {
	if (active === true) {
		return (
			<span className="inline-flex rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-medium text-success-800 dark:bg-success-900 dark:text-success-200">
				Active
			</span>
		);
	}
	if (active === false) {
		return (
			<span className="inline-flex rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-black-600 dark:text-neutral-300">
				Inactive
			</span>
		);
	}
	return null;
}

function ClauseDetailBody({ detail }: { detail: ClauseDetailApi }) {
	const general = detail.sections?.find((s) => s.name === "general")?.fields?.[0] as ClauseSectionFields | undefined;
	const gsa = detail.sections?.find((s) => s.name === "gsa")?.fields?.[0] as ClauseSectionFields | undefined;
	const flow = detail.sections?.find((s) => s.name === "flowdown")?.fields?.[0] as ClauseSectionFields | undefined;

	const title = strVal(general?.title) || detail.displayId || "Clause";

	const generalRows = useMemo(
		() => buildGeneralRows(general, detail.displayId ?? detail._id),
		[general, detail.displayId, detail._id]
	);
	const gsaRows = useMemo(() => buildGsaRows(gsa), [gsa]);
	const flowRows = useMemo(() => buildFlowdownRows(flow), [flow]);

	return (
		<div className="flex flex-col gap-6">
			<div className="min-w-0">
				<Title className="!text-xl sm:!text-2xl">{title}</Title>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<StatusPill active={detail.isActive} />
					<TagsRow tags={detail.tags} />
				</div>
			</div>

			<CollapsibleSection title="GENERAL">
				<ThreeColumnGrid rows={generalRows} />
			</CollapsibleSection>

			<CollapsibleSection title="GSA">
				<ThreeColumnGrid rows={gsaRows} />
			</CollapsibleSection>

			<CollapsibleSection title="FLOWDOWN">
				<ThreeColumnGrid rows={flowRows} />
			</CollapsibleSection>
		</div>
	);
}

function clauseDetailTitle(detail: ClauseDetailApi | undefined): string {
	if (!detail) return "Clause";
	const general = detail.sections?.find((s) => s.name === "general")?.fields?.[0] as
		| ClauseSectionFields
		| undefined;
	return strVal(general?.title) || detail.displayId || "Clause";
}

export const ClauseDetailPage = () => {
	const { id } = useParams<{ id: string }>();
	const clauseQuery = useClauseDetailQuery({ id });

	const navbarBreadcrumb = useMemo(
		() => [crumb("Clauses", "/clauses"), crumb(clauseDetailTitle(clauseQuery.data))],
		[clauseQuery.data]
	);
	usePageBreadcrumb(navbarBreadcrumb);

	useEffect(() => {
		if (!clauseQuery.isError || !clauseQuery.error) return;
		const err = clauseQuery.error;
		const message =
			err instanceof ApiError && err.status === 404
				? "This clause could not be found."
				: formatUserFacingError(err, "Could not load clause.");
		toast.error(message, { toastId: `clause-detail-${id ?? "unknown"}` });
	}, [clauseQuery.isError, clauseQuery.error, id]);

	if (!id?.trim()) {
		return (
			<CardMain>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">Missing clause id.</p>
			</CardMain>
		);
	}

	if (clauseQuery.isPending) {
		return (
			<CardMain className="flex min-h-[min(360px,calc(100vh-200px))] flex-1 items-center justify-center">
				<PageLoader mode="embedded" />
			</CardMain>
		);
	}

	if (!clauseQuery.data) {
		return (
			<CardMain>
				<p className="text-sm text-neutral-500 dark:text-neutral-400">No clause data.</p>
			</CardMain>
		);
	}

	return (
		<CardMain className="flex flex-col gap-6">
			<ClauseDetailBody detail={clauseQuery.data} />
		</CardMain>
	);
};
