import { forwardRef, type ReactNode } from "react";
import cn from "classnames";
import { NAVBAR_HEIGHT } from "../../constants/global";

export interface CardMainProps {
	className?: string;
	children: ReactNode;
}

export const CardMain = forwardRef<HTMLDivElement, CardMainProps>(function CardMain(
	{ className, children },
	ref
) {
	return (
		<div
			ref={ref}
			className={cn("bg-neutral-50 p-6 dark:bg-black-900", className)}
			style={{ minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}
		>
			{children}
		</div>
	);
});
