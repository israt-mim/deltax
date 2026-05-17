import type { ReactNode } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card } from "../base/Card";
import { Typography } from "../base/Typography";
import { useDarkMode } from "../../hooks/useDarkMode";
import type { CategoryCount, ChartSlice, MonthlyCount } from "../../lib/dashboardAggregations";

type ChartCardProps = {
	title: string;
	subtitle?: string;
	children: ReactNode;
};

function ChartCard({ title, subtitle, children }: ChartCardProps) {
	return (
		<Card className="flex flex-col gap-3 overflow-hidden">
			<div>
				<Typography
					size="small"
					variant="semibold"
					appearance="custom"
					className="text-neutral-800 dark:text-neutral-200"
				>
					{title}
				</Typography>
				{subtitle ? (
					<p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
				) : null}
			</div>
			<div className="h-56 w-full min-h-[14rem]">{children}</div>
		</Card>
	);
}

function useChartTheme() {
	const { isDark } = useDarkMode();
	return {
		grid: isDark ? "#2d3748" : "#e5e7eb",
		axis: isDark ? "#9ca3af" : "#6b7280",
		tooltipBg: isDark ? "#1f2937" : "#ffffff",
		tooltipBorder: isDark ? "#374151" : "#e5e7eb",
		tooltipText: isDark ? "#f3f4f6" : "#111827",
		tooltipMuted: isDark ? "#9ca3af" : "#6b7280",
		stroke: isDark ? "#0077E3" : "#016DCF",
	};
}

function chartTooltipStyle(theme: ReturnType<typeof useChartTheme>) {
	return {
		backgroundColor: theme.tooltipBg,
		border: `1px solid ${theme.tooltipBorder}`,
		borderRadius: 8,
		color: theme.tooltipText,
		fontSize: 12,
	};
}

function EmptyChart({ message }: { message: string }) {
	return (
		<div className="flex h-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-gradient-to-b from-primary-50/30 to-transparent dark:border-black-600 dark:from-primary-950/20">
			<p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
		</div>
	);
}

type TrendTooltipProps = {
	active?: boolean;
	payload?: Array<{ value?: number; payload?: MonthlyCount }>;
	label?: string;
};

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
	const theme = useChartTheme();
	if (!active || !payload?.length) return null;
	const count = payload[0]?.value ?? 0;

	return (
		<div className="rounded-lg border px-3 py-2 shadow-200" style={chartTooltipStyle(theme)}>
			<p className="text-xs font-medium" style={{ color: theme.tooltipMuted }}>
				{label}
			</p>
			<p className="mt-0.5 text-lg font-semibold tabular-nums">{count.toLocaleString()}</p>
			<p className="text-xs" style={{ color: theme.tooltipMuted }}>
				agreements created
			</p>
		</div>
	);
}

type AgreementTrendChartProps = {
	data: MonthlyCount[];
};

function AgreementTrendChart({ data }: AgreementTrendChartProps) {
	const theme = useChartTheme();
	const hasData = data.some((d) => d.count > 0);
	const periodTotal = data.reduce((sum, d) => sum + d.count, 0);

	if (!hasData) return <EmptyChart message="No agreements in the last 6 months" />;

	return (
		<div className="flex h-full flex-col">
			<p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
				<span className="font-semibold text-primary-600 dark:text-primary-300">
					{periodTotal.toLocaleString()}
				</span>{" "}
				created in the last 6 months
			</p>
			<div className="min-h-0 flex-1">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
						<defs>
							<linearGradient id="agreementTrendFill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={theme.stroke} stopOpacity={0.35} />
								<stop offset="100%" stopColor={theme.stroke} stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="4 4" stroke={theme.grid} vertical={false} />
						<XAxis
							dataKey="month"
							tick={{ fill: theme.axis, fontSize: 11 }}
							axisLine={false}
							tickLine={false}
							dy={8}
						/>
						<YAxis
							allowDecimals={false}
							tick={{ fill: theme.axis, fontSize: 11 }}
							axisLine={false}
							tickLine={false}
							width={32}
						/>
						<Tooltip
							content={<TrendTooltip />}
							cursor={{ stroke: theme.stroke, strokeWidth: 1, strokeDasharray: "4 4" }}
						/>
						<Area
							type="monotone"
							dataKey="count"
							stroke={theme.stroke}
							strokeWidth={2.5}
							fill="url(#agreementTrendFill)"
							dot={{ r: 4, fill: theme.stroke, strokeWidth: 2, stroke: theme.tooltipBg }}
							activeDot={{ r: 6, fill: theme.stroke, strokeWidth: 2, stroke: theme.tooltipBg }}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}


function StatusPieChart({ data, emptyMessage = "No data yet" }: { data: ChartSlice[]; emptyMessage?: string }) {
	const theme = useChartTheme();
	if (data.length === 0) return <EmptyChart message={emptyMessage} />;

	return (
		<ResponsiveContainer width="100%" height="100%">
			<PieChart>
				<Pie
					data={data}
					dataKey="value"
					nameKey="name"
					cx="50%"
					cy="50%"
					innerRadius={48}
					outerRadius={72}
					paddingAngle={2}
				>
					{data.map((entry) => (
						<Cell key={entry.name} fill={entry.fill ?? "#016DCF"} />
					))}
				</Pie>
				<Tooltip contentStyle={chartTooltipStyle(theme)} />
				<Legend wrapperStyle={{ fontSize: 12, color: theme.axis }} />
			</PieChart>
		</ResponsiveContainer>
	);
}

function MonthlyBarChart({ data }: { data: MonthlyCount[] }) {
	const theme = useChartTheme();
	const hasData = data.some((d) => d.count > 0);
	if (!hasData) return <EmptyChart message="No agreements in the last 6 months" />;

	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
				<CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
				<XAxis dataKey="month" tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
				<YAxis allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
				<Tooltip contentStyle={chartTooltipStyle(theme)} />
				<Bar dataKey="count" name="Agreements" fill="#016DCF" radius={[4, 4, 0, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}

function CategoryBarChart({ data }: { data: CategoryCount[] }) {
	const theme = useChartTheme();
	if (data.length === 0) return <EmptyChart message="No category data yet" />;

	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart layout="vertical" data={data} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
				<CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
				<XAxis type="number" allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
				<YAxis
					type="category"
					dataKey="name"
					width={100}
					tick={{ fill: theme.axis, fontSize: 11 }}
					axisLine={false}
					tickLine={false}
				/>
				<Tooltip contentStyle={chartTooltipStyle(theme)} />
				<Bar dataKey="count" name="Agreements" fill="#0054A1" radius={[0, 4, 4, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}

export type DashboardChartsProps = {
	loading?: boolean;
	sampleNote?: string;
	agreementStatus: ChartSlice[];
	templateActivation: ChartSlice[];
	templateCompletion: ChartSlice[];
	agreementsByMonth: MonthlyCount[];
	topCategories: CategoryCount[];
};

export function DashboardCharts({
	loading,
	sampleNote,
	agreementStatus,
	templateActivation,
	templateCompletion,
	agreementsByMonth,
	topCategories,
}: DashboardChartsProps) {
	const chartCards = (
		<>
			<ChartCard title="Agreement activity" subtitle="New agreements over the last 6 months">
				<AgreementTrendChart data={agreementsByMonth} />
			</ChartCard>
			<ChartCard title="Agreement status" subtitle="From recent agreements">
				<StatusPieChart data={agreementStatus} emptyMessage="No agreements yet" />
			</ChartCard>
			<ChartCard title="Template activation" subtitle="Active vs draft templates">
				<StatusPieChart data={templateActivation} emptyMessage="No templates yet" />
			</ChartCard>
			<ChartCard title="Template setup" subtitle="Configured vs in progress">
				<StatusPieChart data={templateCompletion} emptyMessage="No templates yet" />
			</ChartCard>
			<ChartCard title="New agreements" subtitle="Created per month (last 6 months)">
				<MonthlyBarChart data={agreementsByMonth} />
			</ChartCard>
			<ChartCard title="Agreements by category" subtitle="Top categories in sample">
				<CategoryBarChart data={topCategories} />
			</ChartCard>
		</>
	);

	if (loading) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Card key={i} className="h-72 animate-pulse bg-neutral-100 dark:bg-black-700/50">
						<span className="sr-only">Loading chart</span>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{sampleNote ? (
				<p className="text-xs text-neutral-500 dark:text-neutral-400">{sampleNote}</p>
			) : null}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{chartCards}</div>
		</div>
	);
}
