import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { Title } from "../components/base/Title";
import { Typography } from "../components/base/Typography";
import { useColumns, type ColumnConfig } from "../hooks/useColumns";
import { configureDashboardCards } from "../dummy-data/configure/dashboard";
import { useAgreementConfigsInfiniteList, useAgreementConfigsTotalCount, useFieldsInfiniteList, useFieldsTotalCount } from "../api";
import { useTemplatesTotalCount } from "../api/hooks/templates";
import type { FieldRow } from "../schemas/fieldConfiguration";
import {
	agreementConfigToTableRow,
	agreementListScrollableColumnConfigs,
	agreementStatusColumnDef,
	type AgreementConfigTableRow,
} from "./agreementConfiguration/agreementListTableShared";
import { Tabs } from "../components/base/Tabs";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";

const fieldColumnConfigs: ColumnConfig<FieldRow>[] = [
	{ key: "name", name: "Name", width: 180 },
	{ key: "group", name: "Group", width: 180 },
	{ key: "type", name: "Type", width: 140 },
	{ key: "context", name: "Context", width: 200 },
];

function formatCount(n: number | undefined, loading: boolean): string {
	if (loading) return "…";
	if (n === undefined) return "—";
	return String(n);
}

export const Configure = () => {
	usePageBreadcrumb([crumb("Configure", "/configure")]);

	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<"fields" | "agreements">("agreements");

	const fieldsTotalQuery = useFieldsTotalCount({ sort: "-createdAt" });
	const templatesTotalQuery = useTemplatesTotalCount({ sort: "-createdAt" });
	const fieldsListQuery = useFieldsInfiniteList({
		q: "",
		sort: "-createdAt",
		enabled: activeTab === "fields",
	});
	const agreementsTotalQuery = useAgreementConfigsTotalCount({ sort: "-createdAt" });
	const agreementsListQuery = useAgreementConfigsInfiniteList({
		sort: "-createdAt",
		enabled: activeTab === "agreements",
	});

	const fieldColumns = useColumns(fieldColumnConfigs);
	const agreementScrollableColumns = useColumns(agreementListScrollableColumnConfigs);
	const agreementColumns = useMemo(
		() => [...agreementScrollableColumns, agreementStatusColumnDef("standalone")],
		[agreementScrollableColumns]
	);

	const fieldRows = useMemo(
		() => fieldsListQuery.data?.pages.flatMap((p) => p.data) ?? [],
		[fieldsListQuery.data]
	);

	const loadMoreFields = useCallback(() => {
		if (fieldsListQuery.hasNextPage && !fieldsListQuery.isFetchingNextPage) {
			void fieldsListQuery.fetchNextPage();
		}
	}, [fieldsListQuery.hasNextPage, fieldsListQuery.isFetchingNextPage, fieldsListQuery.fetchNextPage]);

	const agreementRows = useMemo(
		() => agreementsListQuery.data?.pages.flatMap((p) => p.data.map(agreementConfigToTableRow)) ?? [],
		[agreementsListQuery.data]
	);

	const loadMoreAgreements = useCallback(() => {
		if (agreementsListQuery.hasNextPage && !agreementsListQuery.isFetchingNextPage) {
			void agreementsListQuery.fetchNextPage();
		}
	}, [
		agreementsListQuery.hasNextPage,
		agreementsListQuery.isFetchingNextPage,
		agreementsListQuery.fetchNextPage,
	]);

	const handleViewAll = useCallback(() => {
		void navigate(`/configure/${activeTab}`);
	}, [activeTab, navigate]);

	const dashboardItems = useMemo(() => {
		const fieldCount = fieldsTotalQuery.data;
		const agreementCount = agreementsTotalQuery.data;
		const templatesCount = templatesTotalQuery.data;
		return configureDashboardCards.map((item) => ({
			...item,
			count:
				item.name === "Field"
					? formatCount(fieldCount, fieldsTotalQuery.isPending)
					: item.name === "Agreement"
					? formatCount(agreementCount, agreementsTotalQuery.isPending)
					: item.name === "Templates"
					? formatCount(templatesCount, templatesTotalQuery.isPending)
					: undefined,
		}));
	}, [
		fieldsTotalQuery.data,
		fieldsTotalQuery.isPending,
		agreementsTotalQuery.data,
		agreementsTotalQuery.isPending,
		templatesTotalQuery.data,
		templatesTotalQuery.isPending,
	]);

	const fieldsInitialLoading = fieldsListQuery.isPending && fieldRows.length === 0;
	const agreementsInitialLoading = agreementsListQuery.isPending && agreementRows.length === 0;

	return (
		<CardMain className="flex flex-col gap-3">
			<Title>Configuration</Title>

			<div className="flex flex-wrap gap-3 items-center">
				{dashboardItems.map((item) => (
					<Card
						key={item.name}
						className={`cursor-pointer max-w-60 flex flex-row gap-3 transition-all hover:shadow-200 hover:scale-[1.02]`}
						onClick={() => void navigate(item.to)}
					>
						<div className="flex items-center justify-center rounded-lg border border-primary-100 bg-primary-50 p-2 dark:border-black-500 dark:bg-black-700">
							{item.icon}
						</div>
						<div className="flex flex-col">
							<Typography
								size="extra-small"
								variant="semibold"
								appearance="custom"
								className="text-neutral-600 dark:text-neutral-300"
							>
								{item.name}
							</Typography>
							{item.count !== undefined && (
								<Typography
									size="large"
									variant="semibold"
									appearance="custom"
									className="text-neutral-900 dark:text-white"
								>
									{item.count}
								</Typography>
							)}
						</div>
					</Card>
				))}
			</div>

			<Card className="flex flex-col gap-3">
				<div className="flex flex-row gap-2 justify-between items-center">
					<Typography
						size="medium"
						variant="semibold"
						appearance="custom"
						className="text-neutral-800 dark:text-neutral-200"
					>
						Most Recent
					</Typography>

					<button
						type="button"
						className={`text-sm text-primary-500 cursor-pointer bg-transparent border-0 p-0 font-inherit`}
						onClick={handleViewAll}
					>
						View All
					</button>
				</div>

				<Tabs
					items={[
						{ key: "agreements", label: "Agreements" },
						{ key: "fields", label: "Fields" },
					]}
					activeKey={activeTab}
					onChange={(key) => setActiveTab(key as "fields" | "agreements")}
					size="sm"
					variant="pill"
				/>

				{activeTab === "fields" ? (
					<InfiniteTable<FieldRow>
						data={fieldRows}
						height="calc(100vh - 330px)"
						columns={fieldColumns}
						onLoadMore={loadMoreFields}
						isLoading={fieldsListQuery.isFetchingNextPage}
						hasMore={Boolean(fieldsListQuery.hasNextPage)}
						isInitialLoading={fieldsInitialLoading}
						onRowClick={(row) => void navigate(`/configure/fields/${row.id}`)}
					/>
				) : (
					<InfiniteTable<AgreementConfigTableRow>
						data={agreementRows}
						height="calc(100vh - 330px)"
						columns={agreementColumns}
						onLoadMore={loadMoreAgreements}
						isLoading={agreementsListQuery.isFetchingNextPage}
						hasMore={Boolean(agreementsListQuery.hasNextPage)}
						isInitialLoading={agreementsInitialLoading}
						onRowClick={(row) => void navigate(`/configure/agreements/${encodeURIComponent(row._id)}`)}
					/>
				)}
			</Card>
		</CardMain>
	);
};
