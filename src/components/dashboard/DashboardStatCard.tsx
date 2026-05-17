import type { ReactNode } from "react";
import { Card } from "../base/Card";
import { Typography } from "../base/Typography";

type DashboardStatCardProps = {
	label: string;
	value: string;
	icon: ReactNode;
	loading?: boolean;
	onClick?: () => void;
};

export function DashboardStatCard({ label, value, icon, loading, onClick }: DashboardStatCardProps) {
	return (
		<Card
			className={`flex flex-row gap-3 transition-all ${onClick ? "cursor-pointer hover:scale-[1.02] hover:shadow-200 dark:hover:border-primary-800 dark:hover:bg-black-700/80" : ""}`}
			onClick={onClick}
		>
			<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 dark:border-black-500 dark:bg-black-700">
				{icon}
			</div>
			<div className="flex min-w-0 flex-col justify-center">
				<Typography
					size="extra-small"
					variant="semibold"
					appearance="custom"
					className="text-neutral-600 dark:text-neutral-400"
				>
					{label}
				</Typography>
				<Typography
					size="large"
					variant="semibold"
					appearance="custom"
					className="text-neutral-900 dark:text-white"
				>
					{loading ? "…" : value}
				</Typography>
			</div>
		</Card>
	);
}
