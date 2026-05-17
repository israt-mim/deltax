import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
	ApiError,
	getAgreementStepDetails,
	type AgreementDashboardData,
	type AgreementDashboardUser,
	type AgreementStepDetailsData,
	type AgreementStepDetailsField,
} from "../../api";
import { Skeleton } from "../../components/base/Skeleton";
import { Typography } from "../../components/base/Typography";
import { formatUsDateTime } from "../../lib/formatDateTime";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { displayLineItemCell } from "./agreementLineItemsUtils";
import { AgreementTeamsStepPanel } from "./AgreementTeamsStepPanel";

export interface AgreementDashboardPanelProps {
	agreementId: string;
	dashboard: AgreementDashboardData | undefined;
	dashboardLoading: boolean;
	dashboardError: string | null;
}

function userDisplayName(user: AgreementDashboardUser | null | undefined): string {
	if (!user) return "—";
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return fullName || user.username?.trim() || user.email?.trim() || "—";
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1">
			<span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
				{label}
			</span>
			<div className="min-w-0 text-sm font-medium text-neutral-900 dark:text-white">{children}</div>
		</div>
	);
}

function MetaUserItem({
	label,
	user,
}: {
	label: string;
	user: AgreementDashboardUser | null | undefined;
}) {
	return (
		<MetaItem label={label}>
			{user ? (
				<span className="truncate">{userDisplayName(user)}</span>
			) : (
				<span>—</span>
			)}
		</MetaItem>
	);
}

function StatusBadge({ status }: { status: string }) {
	const label = status.trim() || "Unknown";
	const isDraft = /draft/i.test(label);
	const isActive = /active/i.test(label);
	const isApproval = /approval/i.test(label);
	const isSigned = /sign/i.test(label);
	const tone = isActive
		? "bg-success-50 text-success-700 dark:bg-success-950/40 dark:text-success-300"
		: isApproval
			? "bg-warning-50 text-warning-700 dark:bg-warning-950/40 dark:text-warning-300"
			: isSigned
				? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
				: isDraft
					? "bg-neutral-100 text-neutral-700 dark:bg-black-600 dark:text-neutral-300"
					: "bg-neutral-100 text-neutral-700 dark:bg-black-600 dark:text-neutral-300";
	return (
		<span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${tone}`}>
			{label}
		</span>
	);
}

function fieldDisplayValue(field: AgreementStepDetailsField, value: unknown): string {
	if (field.dataType === "Date" || field.dataType === "DateTime") {
		if (value == null || value === "") return "—";
		const fmt = formatUsDateTime(String(value));
		return fmt || "—";
	}
	return displayLineItemCell(field, value);
}

export function AgreementDashboardPanel({
	agreementId,
	dashboard,
	dashboardLoading,
	dashboardError,
}: AgreementDashboardPanelProps) {
	const [headerDetails, setHeaderDetails] = useState<AgreementStepDetailsData | null>(null);
	const [headerLoading, setHeaderLoading] = useState(false);
	const [headerError, setHeaderError] = useState<string | null>(null);

	useEffect(() => {
		if (!agreementId) {
			setHeaderDetails(null);
			setHeaderError(null);
			setHeaderLoading(false);
			return;
		}

		let cancelled = false;
		setHeaderLoading(true);
		setHeaderError(null);

		void getAgreementStepDetails(agreementId, "header")
			.then((data) => {
				if (cancelled) return;
				setHeaderDetails(data);
				setHeaderLoading(false);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setHeaderDetails(null);
				setHeaderLoading(false);
				const message =
					err instanceof ApiError && err.status === 404
						? null
						: formatUserFacingError(err, "Could not load agreement overview.");
				setHeaderError(message);
				if (message) {
					toast.error(message, { toastId: `agreement-dashboard-overview-${agreementId}` });
				}
			});

		return () => {
			cancelled = true;
		};
	}, [agreementId]);

	const overviewFields = useMemo(() => {
		if (!headerDetails?.sections?.length) return [] as Array<{ section: string; field: AgreementStepDetailsField }>;
		const flat: Array<{ section: string; field: AgreementStepDetailsField }> = [];
		for (const sec of headerDetails.sections) {
			for (const field of sec.fields ?? []) {
				if (field.visible === false) continue;
				flat.push({ section: sec.name?.trim() || "Overview", field });
			}
		}
		return flat;
	}, [headerDetails]);

	const valueByFieldId = useMemo(() => {
		const map: Record<string, unknown> = {};
		for (const { field } of overviewFields) {
			map[field.id] = field.value;
		}
		return map;
	}, [overviewFields]);

	return (
		<div className="flex flex-col gap-4">
			<section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-black-600 dark:bg-black-800">
				<div className="mb-3 flex items-center justify-between gap-3">
					<h3 className="mb-0 text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">
						Status
					</h3>
				</div>
				{dashboardLoading ? (
					<Skeleton rounded="full" className="h-7 w-20" />
				) : dashboardError ? (
					<Typography size="small" className="text-error-600 dark:text-error-400">
						{dashboardError}
					</Typography>
				) : (
					<div className="flex items-center">
						<StatusBadge status={dashboard?.status ?? "Draft"} />
					</div>
				)}
			</section>

			<section className="rounded-lg border border-neutral-200 bg-white px-6 py-4 dark:border-black-600 dark:bg-black-800">
				<div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
					<MetaItem label="Display ID">
						{dashboard?.displayId?.trim() || "—"}
					</MetaItem>
					<MetaUserItem label="Owner" user={dashboard?.createdBy ?? null} />
					<MetaUserItem label="Created By" user={dashboard?.createdBy ?? null} />
					<MetaItem label="Created On">
						{dashboard?.createdAt ? formatUsDateTime(dashboard.createdAt) : "—"}
					</MetaItem>
					<MetaUserItem label="Modified By" user={dashboard?.updatedBy ?? null} />
					<MetaItem label="Modified On">
						{dashboard?.updatedAt ? formatUsDateTime(dashboard.updatedAt) : "—"}
					</MetaItem>
				</div>
			</section>

			<section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-black-600 dark:bg-black-800">
				<div className="mb-3 flex items-center justify-between gap-3">
					<h3 className="mb-0 text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">
						Overview
					</h3>
				</div>

				{headerLoading ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="flex flex-col gap-2">
								<Skeleton className="h-3 w-28" />
								<Skeleton className="h-4 w-full" />
							</div>
						))}
					</div>
				) : headerError ? (
					<Typography size="small" className="text-error-600 dark:text-error-400">
						{headerError}
					</Typography>
				) : overviewFields.length === 0 ? (
					<p className="text-sm text-neutral-500 dark:text-neutral-400">
						No header fields are configured for this agreement.
					</p>
				) : (
					<div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
						{overviewFields.map(({ field }) => (
							<div key={field.id} className="flex min-w-0 flex-col gap-0.5">
								<span className="truncate text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
									{field.name?.trim() || field.id}
								</span>
								<span
									className="break-words text-sm font-medium text-neutral-900 dark:text-white"
									title={String(valueByFieldId[field.id] ?? "")}
								>
									{fieldDisplayValue(field, valueByFieldId[field.id])}
								</span>
							</div>
						))}
					</div>
				)}
			</section>

			<section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-black-600 dark:bg-black-800">
				<div className="mb-3 flex items-center justify-between gap-3">
					<h3 className="mb-0 text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">
						Teams
					</h3>
				</div>
				<AgreementTeamsStepPanel agreementId={agreementId} readOnly />
			</section>
		</div>
	);
}
