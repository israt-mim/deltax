import cn from "classnames";
import { Card } from "../base/Card";
import { CardMain } from "../base/CardMain";
import { Skeleton } from "../base/Skeleton";

/** Agreement details / create — header card + tabs + body. */
export function AgreementDetailsPageSkeleton({ className }: { className?: string }) {
	return (
		<CardMain className={cn("flex min-h-0 flex-1 flex-col gap-0 !m-0 !p-0", className)}>
			<Card className="flex flex-col gap-4 p-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<Skeleton rounded="lg" className="h-10 w-10 shrink-0" />
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<Skeleton className="h-6 w-48 max-w-full" />
							<Skeleton className="h-4 w-64 max-w-full" />
						</div>
					</div>
					<Skeleton className="h-8 w-24 shrink-0" />
				</div>
				<div className="flex gap-4 border-b border-neutral-200 pb-0 dark:border-black-600">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="mb-2 h-8 w-20" />
					))}
				</div>
			</Card>
			<div className="m-4 flex flex-1 flex-col gap-4">
				<AgreementStepFormSkeleton />
			</div>
		</CardMain>
	);
}

/** Collapsible sections + field grid (agreement step form). */
export function AgreementStepFormSkeleton({ sections = 2 }: { sections?: number }) {
	return (
		<div className="flex flex-col gap-4">
			{Array.from({ length: sections }).map((_, si) => (
				<div
					key={si}
					className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-black-600 dark:bg-black-800/40"
				>
					<Skeleton className="mb-4 h-5 w-40" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, fi) => (
							<div key={fi} className="flex flex-col gap-2">
								<Skeleton className="h-3 w-24" />
								<Skeleton className="h-9 w-full" />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

/** Line items / clauses table with toolbar. */
export function AgreementTableSkeleton({
	rows = 6,
	columns = 5,
	showToolbar = true,
}: {
	rows?: number;
	columns?: number;
	showToolbar?: boolean;
}) {
	return (
		<div className="flex flex-col gap-4">
			{showToolbar ? (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Skeleton className="h-9 w-full max-w-md" />
					<Skeleton className="h-9 w-24" />
				</div>
			) : null}
			<div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-black-600">
				<div className="flex gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-black-600 dark:bg-black-800">
					{Array.from({ length: columns }).map((_, i) => (
						<Skeleton key={i} className="h-3 w-20" />
					))}
				</div>
				{Array.from({ length: rows }).map((_, ri) => (
					<div
						key={ri}
						className="flex gap-4 border-b border-neutral-100 px-4 py-3 last:border-0 dark:border-black-600"
					>
						{Array.from({ length: columns }).map((_, ci) => (
							<Skeleton key={ci} className="h-4 w-full max-w-[140px]" />
						))}
					</div>
				))}
			</div>
		</div>
	);
}

/** Dashboard tab — status, meta row, overview grid. */
export function AgreementDashboardSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-black-600 dark:bg-black-800">
				<Skeleton className="mb-3 h-4 w-16" />
				<Skeleton rounded="full" className="h-7 w-20" />
			</section>
			<section className="rounded-lg border border-neutral-200 bg-white px-6 py-4 dark:border-black-600 dark:bg-black-800">
				<div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex flex-col gap-2">
							<Skeleton className="h-3 w-16" />
							<Skeleton className="h-4 w-full" />
						</div>
					))}
				</div>
			</section>
			<section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-black-600 dark:bg-black-800">
				<Skeleton className="mb-4 h-4 w-20" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 9 }).map((_, i) => (
						<div key={i} className="flex flex-col gap-2">
							<Skeleton className="h-3 w-28" />
							<Skeleton className="h-4 w-full" />
						</div>
					))}
				</div>
			</section>
		</div>
	);
}

/** Teams tab — stacked team cards. */
export function AgreementTeamsSkeleton({ cards = 3 }: { cards?: number }) {
	return (
		<div className="flex flex-col gap-4">
			{Array.from({ length: cards }).map((_, i) => (
				<div
					key={i}
					className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-4 dark:border-black-600 dark:bg-black-800"
				>
					<div className="mb-4 flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Skeleton rounded="full" className="h-6 w-6" />
							<Skeleton className="h-5 w-32" />
						</div>
						<Skeleton className="h-8 w-28" />
					</div>
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, j) => (
							<Skeleton key={j} className="h-10 w-full" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

/** Line item editor — back row + form. */
export function AgreementLineItemEditorSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3 border-b border-neutral-200 pb-4 dark:border-black-600">
				<Skeleton rounded="md" className="h-9 w-9" />
				<Skeleton className="h-6 w-40" />
			</div>
			<AgreementStepFormSkeleton sections={1} />
		</div>
	);
}

/** Configuration wizard page — header + stepper + content. */
export function AgreementConfigurationPageSkeleton() {
	return (
		<CardMain className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<Skeleton rounded="md" className="h-6 w-6" />
				<Skeleton className="h-6 w-36" />
				<Skeleton rounded="full" className="h-6 w-14" />
			</div>
			<Skeleton className="h-4 w-72 max-w-full" />
			<div className="flex gap-2 overflow-hidden py-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-9 w-24 shrink-0" />
				))}
			</div>
			<Card className="flex flex-1 flex-col gap-4 p-4">
				<AgreementStepFormSkeleton sections={2} />
			</Card>
		</CardMain>
	);
}

/** Field / clause detail — title + section cards. */
export function DetailPageSkeleton() {
	return (
		<CardMain className="flex flex-col gap-6">
			<Skeleton className="h-8 w-56 max-w-full" />
			{Array.from({ length: 2 }).map((_, i) => (
				<Card key={i} className="flex flex-col gap-4 p-4">
					<Skeleton className="h-5 w-32" />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, j) => (
							<div key={j} className="flex flex-col gap-2">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-4 w-full" />
							</div>
						))}
					</div>
				</Card>
			))}
		</CardMain>
	);
}

/** Compact inline label (e.g. field card in layout panel). */
export function SkeletonInline({ className }: { className?: string }) {
	return <Skeleton className={cn("h-4 w-32", className)} />;
}
