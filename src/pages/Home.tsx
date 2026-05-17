import { useNavigate } from "react-router-dom";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AcUnitOutlinedIcon from "@mui/icons-material/AcUnitOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { Typography } from "../components/base/Typography";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";
import { userDisplayName } from "../lib/userDisplay";

type QuickLink = {
	label: string;
	description: string;
	to: string;
	icon: ReactNode;
};

const QUICK_LINKS: QuickLink[] = [
	{
		label: "Agreements",
		description: "Browse and manage your contracts",
		to: "/agreements",
		icon: <DescriptionOutlinedIcon sx={{ fontSize: 24 }} className="text-primary-600 dark:text-primary-300" />,
	},
	{
		label: "Clauses",
		description: "Review clause library and details",
		to: "/clauses",
		icon: <AcUnitOutlinedIcon sx={{ fontSize: 24 }} className="text-primary-600 dark:text-primary-300" />,
	},
	{
		label: "Configure",
		description: "Set up fields and agreement templates",
		to: "/configure",
		icon: <SettingsOutlinedIcon sx={{ fontSize: 24 }} className="text-primary-600 dark:text-primary-300" />,
	},
	{
		label: "Settings",
		description: "Manage users, groups, and teams",
		to: "/settings",
		icon: (
			<AdminPanelSettingsOutlinedIcon
				sx={{ fontSize: 24 }}
				className="text-primary-600 dark:text-primary-300"
			/>
		),
	},
];

export const Home = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const welcomeName = user ? userDisplayName(user) : "there";

	usePageBreadcrumb([crumb("Dashboard", "/")]);

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
					Your centralized contract dashboard is up to date. Pick up where you left off or jump into a
					workspace below.
				</p>
			</section>

			<section>
				<Typography
					size="medium"
					variant="semibold"
					appearance="custom"
					className="mb-3 text-neutral-800 dark:text-neutral-200"
				>
					Quick access
				</Typography>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{QUICK_LINKS.map((link) => (
						<Card
							key={link.to}
							className="group cursor-pointer transition-all hover:scale-[1.02] hover:shadow-200 dark:hover:border-primary-800 dark:hover:bg-black-700/80"
							onClick={() => void navigate(link.to)}
						>
							<div className="flex gap-3">
								<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 transition-colors group-hover:border-primary-200 group-hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/60 dark:group-hover:border-primary-700 dark:group-hover:bg-primary-900/50">
									{link.icon}
								</div>
								<div className="min-w-0">
									<Typography
										size="small"
										variant="semibold"
										appearance="custom"
										className="text-neutral-900 dark:text-white"
									>
										{link.label}
									</Typography>
									<p className="mt-1 text-xs leading-snug text-neutral-500 dark:text-neutral-400">
										{link.description}
									</p>
								</div>
							</div>
						</Card>
					))}
				</div>
			</section>
		</CardMain>
	);
};
