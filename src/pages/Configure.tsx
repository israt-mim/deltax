import { Card } from "../components/base/Card"
import { CardMain } from "../components/base/CardMain"
import { Title } from "../components/base/Title"
import { Typography } from "../components/base/Typography"
import { ConfigDashboardCountAPIData } from "../dummy-data/configure/dashboard"

export const Configure = () => {
	return (
		<CardMain className="flex flex-col gap-3">
			<Title>
				Configuration
			</Title>

			<div className="flex gap-3 items-center">
				{ConfigDashboardCountAPIData.map(item => (
					<Card key={item.name} className='p-3 max-w-60 flex flex-row gap-3'>
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

		</CardMain>
	)
}