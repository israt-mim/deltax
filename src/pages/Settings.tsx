import { useEffect, useState } from "react";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
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

const tabLabel = (text: string) => (
	<span className="text-xs font-semibold uppercase tracking-wide">{text}</span>
);

export const Settings = () => {
	const [activeTab, setActiveTab] = useState<TabKey>(TAB_KEYS.groups);
	const [search, setSearch] = useState("");

	useEffect(() => {
		setSearch("");
	}, [activeTab]);

	return (
		<CardMain className="flex flex-col gap-5">
			<Title>Settings</Title>

			<div className="overflow-x-auto pb-1">
				<Tabs
					variant="underline"
					size="sm"
					activeKey={activeTab}
					onChange={(k) => setActiveTab(k as TabKey)}
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

			{activeTab === TAB_KEYS.users && <Users search={search} onSearchChange={setSearch} />}
			{activeTab === TAB_KEYS.groups && <Groups search={search} onSearchChange={setSearch} />}
			{activeTab === TAB_KEYS.teams && <Teams search={search} onSearchChange={setSearch} />}
		</CardMain>
	);
};
