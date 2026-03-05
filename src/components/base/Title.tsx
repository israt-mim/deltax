import type { ReactNode } from "react"
import cn from 'classnames'

export interface TitleProps {
	className?: string;
	children: ReactNode,
}
export const Title = ({ className, children }: TitleProps) => {
	return (
		<div className={cn('text-2xl font-semibold text-neutral-900 dark:text-white', className)}>
			{children}
		</div>
	)
}