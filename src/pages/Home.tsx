import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AcUnitOutlinedIcon from "@mui/icons-material/AcUnitOutlined";
import InputOutlinedIcon from "@mui/icons-material/InputOutlined";
import {
	useAgreementConfigsTotalCount,
	useAgreementsTotalCount,
	useClausesTotalCount,
	useDashboardChartData,
	useFieldsTotalCount,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { CardMain } from "../components/base/CardMain";
import { Typography } from "../components/base/Typography";
import { DashboardCharts } from "../components/dashboard/DashboardCharts";
import { DashboardStatCard } from "../components/dashboard/DashboardStatCard";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { userDisplayName } from "../lib/userDisplay";

function formatStatCount(n: number | undefined, loading: boolean): string {
	if (loading) return "…";
	if (n === undefined) return "—";
	return n.toLocaleString();
}

export const Home = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const welcomeName = user ? userDisplayName(user) : "there";

	usePageBreadcrumb([crumb("Dashboard", "/")]);

	const agreementsTotal = useAgreementsTotalCount();
	const templatesTotal = useAgreementConfigsTotalCount();
	const fieldsTotal = useFieldsTotalCount();
	const clausesTotal = useClausesTotalCount();
	const chartsQuery = useDashboardChartData();

	const sampleNote = useMemo(() => {
		const data = chartsQuery.data;
		if (!data) return undefined;
		const parts: string[] = [];
		if (data.agreementsTotal > data.agreementsSampled) {
			parts.push(`agreements (${data.agreementsSampled} of ${data.agreementsTotal})`);
		}
		if (data.configsTotal > data.configsSampled) {
			parts.push(`templates (${data.configsSampled} of ${data.configsTotal})`);
		}
		if (data.clausesTotal > data.clausesSampled) {
			parts.push(`clauses (${data.clausesSampled} of ${data.clausesTotal})`);
		}
		if (parts.length === 0) return undefined;
		return `Charts use the most recent records: ${parts.join(", ")}. A dedicated dashboard API will show exact totals for large datasets.`;
	}, [chartsQuery.data]);

	return (
		<CardMain className="flex flex-col gap-6">
			<section className="overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-br from-white via-primary-50/40 to-white p-6 shadow-100 dark:border-black-600 dark:from-black-800 dark:via-primary-950/50 dark:to-black-800 dark:shadow-none dark:ring-1 dark:ring-white/5 sm:p-8">
				<p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-300">
					Dashboard
				</p>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
					Welcome back, {welcomeName}!
				</h1>
				<p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
					Your centralized contract dashboard is up to date. Pick up where you left off using the overview
					and analytics below.
				</p>
			</section>

			<section>
				<Typography
					size="medium"
					variant="semibold"
					appearance="custom"
					className="mb-3 text-neutral-800 dark:text-neutral-200"
				>
					Overview
				</Typography>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<DashboardStatCard
						label="Agreements"
						value={formatStatCount(agreementsTotal.data, agreementsTotal.isPending)}
						icon={
							<DescriptionOutlinedIcon
								sx={{ fontSize: 22 }}
								className="text-primary-600 dark:text-primary-300"
							/>
						}
						loading={agreementsTotal.isPending}
						onClick={() => void navigate("/agreements")}
					/>
					<DashboardStatCard
						label="Templates"
						value={formatStatCount(templatesTotal.data, templatesTotal.isPending)}
						icon={
							<DescriptionOutlinedIcon
								sx={{ fontSize: 22 }}
								className="text-primary-600 dark:text-primary-300"
							/>
						}
						loading={templatesTotal.isPending}
						onClick={() => void navigate("/configure/agreements")}
					/>
					<DashboardStatCard
						label="Fields"
						value={formatStatCount(fieldsTotal.data, fieldsTotal.isPending)}
						icon={
							<InputOutlinedIcon
								sx={{ fontSize: 22 }}
								className="text-primary-600 dark:text-primary-300"
							/>
						}
						loading={fieldsTotal.isPending}
						onClick={() => void navigate("/configure/fields")}
					/>
					<DashboardStatCard
						label="Clauses"
						value={formatStatCount(clausesTotal.data, clausesTotal.isPending)}
						icon={
							<AcUnitOutlinedIcon
								sx={{ fontSize: 22 }}
								className="text-primary-600 dark:text-primary-300"
							/>
						}
						loading={clausesTotal.isPending}
						onClick={() => void navigate("/clauses")}
					/>
				</div>
			</section>

			<section>
				<Typography
					size="medium"
					variant="semibold"
					appearance="custom"
					className="mb-3 text-neutral-800 dark:text-neutral-200"
				>
					Analytics
				</Typography>
				{chartsQuery.isError ? (
					<p className="mb-3 text-sm text-error-500">
						{formatUserFacingError(chartsQuery.error, "Could not load chart data.")}{" "}
						<button
							type="button"
							className="font-medium text-primary-600 underline dark:text-primary-400"
							onClick={() => void chartsQuery.refetch()}
						>
							Retry
						</button>
					</p>
				) : null}
				<DashboardCharts
					loading={chartsQuery.isPending}
					sampleNote={sampleNote}
					agreementStatus={chartsQuery.data?.agreementStatus ?? []}
					templateActivation={chartsQuery.data?.templateActivation ?? []}
					templateCompletion={chartsQuery.data?.templateCompletion ?? []}
					agreementsByMonth={chartsQuery.data?.agreementsByMonth ?? []}
					topCategories={chartsQuery.data?.topCategories ?? []}
				/>
			</section>
		</CardMain>
	);
};
