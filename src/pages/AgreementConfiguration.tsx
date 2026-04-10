import { useCallback, useEffect, useState } from "react";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { Button } from "../components/base/Button";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Card } from "../components/base/Card";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { useColumns, type ColumnConfig } from "../hooks/useColumns";
import { fetchAgreementsPage, type AgreementRow } from "../dummy-data/configure/agreements";

const STATUS_COLORS: Record<string, string> = {
	Active: "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
	Draft: "bg-neutral-100 text-neutral-600 dark:bg-black-600 dark:text-neutral-300",
	Expired: "bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300",
	"Under Review": "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300",
	"Pending Approval": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

const agreementColumnConfigs: ColumnConfig<AgreementRow>[] = [
	{
		key: "name",
		name: "Name",
		width: 220,
		minWidth: 140,
		sortable: true,
	},
	{
		key: "category",
		name: "Category",
		width: 140,
		minWidth: 100,
		sortable: true,
	},
	{
		key: "status",
		name: "Status",
		width: 140,
		minWidth: 100,
		sortable: true,
		cell: ({ getValue }) => {
			const status = getValue() as string;
			return (
				<span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[status] ?? ""}`}>
					{status}
				</span>
			);
		},
	},
	{
		key: "owner",
		name: "Owner",
		width: 160,
		minWidth: 100,
		sortable: true,
	},
	{
		key: "createdDate",
		name: "Created",
		width: 140,
		minWidth: 100,
		sortable: true,
	},
	{
		key: "expiryDate",
		name: "Expiry",
		width: 140,
		minWidth: 100,
		sortable: true,
	},
	{
		key: "tags",
		name: "Tags",
		width: 120,
		minWidth: 80,
		sortable: true,
		cell: ({ getValue }) => {
			const tags = getValue() as string[];
			if (!tags?.length) return null;
			return (
				<div className="flex gap-1">
					{tags.map((tag) => (
						<span
							key={tag}
							className="px-2 py-0.5 text-xs font-medium rounded bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300"
						>
							{tag}
						</span>
					))}
				</div>
			);
		},
	},
];

export const AgreementConfiguration = () => {
	const columns = useColumns(agreementColumnConfigs);
	const [agreements, setAgreements] = useState<AgreementRow[]>([]);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	const loadMore = useCallback(() => {
		if (isLoading || !hasMore) return;
		setIsLoading(true);
		fetchAgreementsPage(page).then(({ data, hasMore: more }) => {
			setAgreements((prev) => [...prev, ...data]);
			setPage((prev) => prev + 1);
			setHasMore(more);
			setIsLoading(false);
		});
	}, [page, isLoading, hasMore]);

	useEffect(() => {
		loadMore();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<CardMain className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<Title>Agreements</Title>
				<Button size="md">
					<AddOutlinedIcon sx={{ fontSize: 14 }} />
					New
				</Button>
			</div>

			<Card className="flex flex-col gap-3">
				<InfiniteTable
					data={agreements}
					columns={[
						...columns,
						{
							id: "actions",
							header: "",
							size: 44,
							minSize: 44,
							maxSize: 44,
							enableResizing: false,
							cell: () => (
								<div className="flex items-center justify-center">
									<MoreVertOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-400" />
								</div>
							),
						},
					]}
					height="calc(100vh - 200px)"
					onLoadMore={loadMore}
					isLoading={isLoading}
					hasMore={hasMore}
					enableRowSelection
				/>
			</Card>
		</CardMain>
	);
};
