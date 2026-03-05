import { type ReactNode } from "react";
import cn from 'classnames'

export interface CardProps {
	className?: string;
	children: ReactNode;
}

export const Card = ({ className, children }: CardProps) => {
	return (
		<div className={cn(`bg-white dark:bg-black-800 border border-neutal-200 dark-border-black-600 rounded-lg shadow-100 w-full p-base`, className)}>
			{children}
		</div>
	);
}