import { type ReactNode } from "react";
import cn from 'classnames'

export interface CardProps {
	className?: string;
	children: ReactNode;
	onClick?: () => void;
}

export const Card = ({ className, children, onClick }: CardProps) => {
	return (
		<div
			className={cn(
				"w-full rounded-lg border border-neutral-200 bg-white p-3 shadow-100 dark:border-black-600 dark:bg-black-800 dark:shadow-none dark:ring-1 dark:ring-white/5",
				className
			)}
			onClick={onClick}
		>
			{children}
		</div>
	);
}