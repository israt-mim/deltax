import { useCallback, useEffect, useState } from "react"
import { Card } from "../components/base/Card"
import { CardMain } from "../components/base/CardMain"
import { InfiniteTable } from "../components/base/InfiniteTable"
import { Title } from "../components/base/Title"
import { Typography } from "../components/base/Typography"
import { useColumns, type ColumnConfig } from "../hooks/useColumns"
import { ConfigDashboardCountAPIData } from "../dummy-data/configure/dashboard"
import { fetchFieldsPage, type FieldRow } from "../dummy-data/configure/fields"
import { useNavigate } from "react-router-dom"

const fieldColumnConfigs: ColumnConfig<FieldRow>[] = [
	{ key: "id", name: "ID", width: 60, minWidth: 40, maxWidth: 100 },
	{ key: "name", name: "Name", width: 180 },
	{ key: "type", name: "Type", width: 140 },
	{ key: "agreement", name: "Agreement", width: 200 },
	{
		key: "required",
		name: "Required",
		width: 120,
		cell: ({ getValue }) => (getValue() ? "Yes" : "No"),
	},
	{ key: "createdAt", name: "Created", width: 160, isSticky: true },
]

export const Configure = () => {
	const navigate = useNavigate()
	const columns = useColumns(fieldColumnConfigs)
	const [fields, setFields] = useState<FieldRow[]>([])
	const [page, setPage] = useState(0)
	const [hasMore, setHasMore] = useState(true)
	const [isLoading, setIsLoading] = useState(false)

	const loadMore = useCallback(() => {
		if (isLoading || !hasMore) return
		setIsLoading(true)
		fetchFieldsPage(page).then(({ data, hasMore: more }) => {
			setFields((prev) => [...prev, ...data])
			setPage((prev) => prev + 1)
			setHasMore(more)
			setIsLoading(false)
		})
	}, [page, isLoading, hasMore])

	useEffect(() => {
		loadMore()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<CardMain className="flex flex-col gap-3">
			<Title>
				Configuration
			</Title>

			<div className="flex gap-3 items-center">
				{ConfigDashboardCountAPIData.map(item => (
					<Card key={item.name} className='!p-3 cursor-pointer max-w-60 flex flex-row gap-3 transition-all hover:shadow-200 hover:scale-[1.02]' onClick={() => navigate(item.to!)}>
						<div className='flex items-center justify-center bg-primary-50 p-2 rounded border border-primary-100'>
							{item.icon}
						</div>
						<div className="flex flex-col">
							<Typography size="extra-small" variant="semibold" appearance="custom" className="text-neutral-600 dark:text-neutral-300">
								{item.name}
							</Typography>
							<Typography size="large" variant="semibold" appearance="custom" className="text-neutral-900 dark:text-white">
								{item.count}
							</Typography>
						</div>
					</Card>
				))}
			</div>

			<InfiniteTable
				data={fields}
				columns={columns}
				onLoadMore={loadMore}
				isLoading={isLoading}
				hasMore={hasMore}
			/>
		</CardMain>
	)
}
