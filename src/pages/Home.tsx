import { CardMain } from "../components/base/CardMain"
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb"
import { crumb } from "../lib/breadcrumb"

export const Home = () => {
	usePageBreadcrumb([crumb("Dashboard", "/")]);

	return (
		<CardMain>
			<div className="text-2xl font-semibold text-neutral-900">
				Welcome back, Israt Mim!
			</div>
			<div className="text-sm text-neutral-600">
				Your centralized contract dashboard is up to date.
			</div>
		</CardMain>
	)
}