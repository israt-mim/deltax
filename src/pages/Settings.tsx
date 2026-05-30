import { useSearchParams } from "react-router";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";
import { Tabs } from "../components/base/Tabs";
import { Users } from "../components/modules/settings/Users";
import { Groups } from "../components/modules/settings/Groups";
import { Teams } from "../components/modules/settings/Teams";

const TAB_KEYS = {
	users: "users",
	groups: "groups",
	teams: "teams",
} as const;

type TabKey = (typeof TAB_KEYS)[keyof typeof TAB_KEYS];

const VALID_TABS = new Set<string>(Object.values(TAB_KEYS));

const tabLabel = (text: string) => (
	<span className="text-xs font-semibold uppercase tracking-wide">{text}</span>
);

function resolveTab(raw: string | null): TabKey {
	if (raw && VALID_TABS.has(raw)) return raw as TabKey;
	return TAB_KEYS.users;
}

export const Settings = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = resolveTab(searchParams.get("tab"));
	const search = searchParams.get("q") ?? "";

	usePageBreadcrumb([crumb("Settings", "/settings")]);

	const handleTabChange = (key: string) => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.set("tab", key);
			next.delete("q");
			return next;
		}, { replace: true });
	};

	const handleSearchChange = (value: string) => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (value) next.set("q", value);
			else next.delete("q");
			return next;
		}, { replace: true });
	};

	return (
		<CardMain className="flex flex-col gap-5">
			<Title>Settings</Title>

			<div className="overflow-x-auto pb-1">
				<Tabs
					variant="underline"
					size="sm"
					activeKey={activeTab}
					onChange={handleTabChange}
					underlineActiveClassName="text-primary-600 dark:text-primary-300"
					underlineIndicatorClassName="bg-primary-500 dark:bg-primary-400"
					className="min-w-max"
					items={[
						{ key: TAB_KEYS.users, label: tabLabel("Users") },
						{ key: TAB_KEYS.groups, label: tabLabel("Groups") },
						{ key: TAB_KEYS.teams, label: tabLabel("Teams") },
					]}
				/>
			</div>

			{activeTab === TAB_KEYS.users && <Users search={search} onSearchChange={handleSearchChange} />}
			{activeTab === TAB_KEYS.groups && <Groups search={search} onSearchChange={handleSearchChange} />}
			{activeTab === TAB_KEYS.teams && <Teams search={search} onSearchChange={handleSearchChange} />}
		</CardMain>
	);
};
