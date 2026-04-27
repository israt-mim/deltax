import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { Title } from "../components/base/Title";
import { Typography } from "../components/base/Typography";
import { useColumns, type ColumnConfig } from "../hooks/useColumns";
import { configureDashboardCards } from "../dummy-data/configure/dashboard";
import { allAgreementRows, fetchAgreementsPage, type AgreementRow } from "../dummy-data/configure/agreements";
import { useFieldsInfiniteList, useFieldsTotalCount } from "../api/hooks/fields";
import type { FieldRow } from "../schemas/fieldConfiguration";
import { Tabs } from "../components/base/Tabs";
import { formatUserFacingError } from "../lib/formatUserFacingError";

const fieldColumnConfigs: ColumnConfig<FieldRow>[] = [
	{ key: "name", name: "Name", width: 180 },
	{ key: "group", name: "Group", width: 180 },
	{ key: "type", name: "Type", width: 140 },
	{ key: "context", name: "Context", width: 200 },
];

const agreementPreviewColumnConfigs: ColumnConfig<AgreementRow>[] = [
	{ key: "name", name: "Name", width: 220, minWidth: 140 },
	{ key: "category", name: "Category", width: 140, minWidth: 100 },
	{ key: "status", name: "Status", width: 140, minWidth: 100 },
	{ key: "owner", name: "Owner", width: 160, minWidth: 100 },
];

function formatCount(n: number | undefined, loading: boolean): string {
	if (loading) return "…";
	if (n === undefined) return "—";
	return String(n);
}

export const Configure = () => {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<"fields" | "agreements">("fields");

	const fieldsTotalQuery = useFieldsTotalCount({ sort: "-createdAt" });
	const fieldsListQuery = useFieldsInfiniteList({ q: "", sort: "-createdAt" });

	const fieldColumns = useColumns(fieldColumnConfigs);
	const agreementColumns = useColumns(agreementPreviewColumnConfigs);

	const fieldRows = useMemo(
		() => fieldsListQuery.data?.pages.flatMap((p) => p.data) ?? [],
		[fieldsListQuery.data]
	);

	const loadMoreFields = useCallback(() => {
		if (fieldsListQuery.hasNextPage && !fieldsListQuery.isFetchingNextPage) {
			void fieldsListQuery.fetchNextPage();
		}
	}, [fieldsListQuery.hasNextPage, fieldsListQuery.isFetchingNextPage, fieldsListQuery.fetchNextPage]);

	const [agreements, setAgreements] = useState<AgreementRow[]>([]);
	const [agreementPage, setAgreementPage] = useState(0);
	const [agreementsHasMore, setAgreementsHasMore] = useState(true);
	const [agreementsLoading, setAgreementsLoading] = useState(false);

	const loadMoreAgreements = useCallback(() => {
		if (agreementsLoading || !agreementsHasMore) return;
		setAgreementsLoading(true);
		fetchAgreementsPage(agreementPage).then(({ data, hasMore: more }) => {
			setAgreements((prev) => [...prev, ...data]);
			setAgreementPage((p) => p + 1);
			setAgreementsHasMore(more);
			setAgreementsLoading(false);
		});
	}, [agreementPage, agreementsLoading, agreementsHasMore]);

	useEffect(() => {
		if (activeTab !== "agreements") return;
		if (agreements.length > 0) return;
		if (agreementsLoading) return;
		void loadMoreAgreements();
	}, [activeTab, agreements.length, agreementsLoading, loadMoreAgreements]);

	const handleViewAll = useCallback(() => {
		void navigate(`/configure/${activeTab}`);
	}, [activeTab, navigate]);

	const dashboardItems = useMemo(() => {
		const agreementCount = allAgreementRows.length;
		const fieldCount = fieldsTotalQuery.data;
		return configureDashboardCards.map((item) => ({
			...item,
			count:
				item.name === "Field"
					? formatCount(fieldCount, fieldsTotalQuery.isPending)
					: formatCount(agreementCount, false),
		}));
	}, [fieldsTotalQuery.data, fieldsTotalQuery.isPending]);

	const fieldsInitialLoading = fieldsListQuery.isPending && fieldRows.length === 0;
	const agreementsInitialLoading = agreementsLoading && agreements.length === 0;

	return (
		<CardMain className="flex flex-col gap-3">
			<Title>Configuration</Title>

			{fieldsListQuery.isError && activeTab === "fields" && (
				<p className="text-sm text-error-500">
					{formatUserFacingError(fieldsListQuery.error, "Could not load fields.")}{" "}
					<button
						type="button"
						className="font-medium text-primary-600 underline dark:text-primary-400"
						onClick={() => void fieldsListQuery.refetch()}
					>
						Retry
					</button>
				</p>
			)}

			<div className="flex flex-wrap gap-3 items-center">
				{dashboardItems.map((item) => (
					<Card
						key={item.name}
						className="cursor-pointer max-w-60 flex flex-row gap-3 transition-all hover:shadow-200 hover:scale-[1.02]"
						onClick={() => void navigate(item.to)}
					>
						<div className="flex items-center justify-center bg-primary-50 p-2 rounded border border-primary-100">
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
							<Typography
								size="large"
								variant="semibold"
								appearance="custom"
								className="text-neutral-900 dark:text-white"
							>
								{item.count}
							</Typography>
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
						className="text-sm text-primary-500 cursor-pointer bg-transparent border-0 p-0 font-inherit"
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
					<InfiniteTable<AgreementRow>
						data={agreements}
						height="calc(100vh - 330px)"
						columns={agreementColumns}
						onLoadMore={loadMoreAgreements}
						isLoading={agreementsLoading}
						hasMore={agreementsHasMore}
						isInitialLoading={agreementsInitialLoading}
					/>
				)}
			</Card>
		</CardMain>
	);
};
