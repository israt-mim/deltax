import cn from "classnames";
import React from "react";

export interface TypographyProps {
	children: React.ReactNode;
	variant?: "regular" | "medium" | "semibold" | "bold" | "extrablack";
	size?:
	| "extra-small"
	| "small"
	| "display-small"
	| "medium"
	| "display-medium"
	| "large"
	| "extra-large";
	className?: string;
	onClick?(event: React.MouseEvent<HTMLDivElement>): void;
	highlight?: boolean;
	appearance?: "title" | "body" | "subtitle" | "custom";
	style?: React.CSSProperties;
}

export const Typography = ({
	children,
	variant = "regular",
	size = "medium",
	onClick,
	className,
	highlight,
	appearance = "title",
	style,
}: TypographyProps) => {
	const getFontSize = (): string => {
		switch (size) {
			case "extra-small":
				return "text-xs";
			case "small":
				return "text-sm";
			case "display-small":
				return "text-xl";
			case "medium":
				return "text-base";
			case "display-medium":
				return "text-2xl";
			case "large":
				return "text-lg";
			case "extra-large":
				return "text-4xl";
			default:
				return "text-base";
		}
	};

	const getFontColor = (): string => {
		switch (appearance) {
			case "title":
				return "text-neutral-900 dark:text-white";
			case "body":
				return "text-neutral-600 dark:text-neutral-300";
			case "subtitle":
				return "text-neutral-500 dark:text-neutral-400";
			case "custom":
				return "";
		}
	};

	const getFontWeight = (): string => {
		switch (variant) {
			case "regular":
				return "font-normal";
			case "medium":
				return "font-medium";
			case "semibold":
				return "font-semibold";
			case "bold":
				return "font-bold";
			case "extrablack":
				return "font-black";
			default:
				return "font-normal";
		}
	};

	const typographyClasses = `${getFontSize()} ${getFontWeight()} ${getFontColor()}`;
	const combinedClasses = cn(
		typographyClasses,
		className,
		highlight ? "bg-yellow-100 dark:bg-yellow-900" : ""
	);

	return (
		<div className={combinedClasses} onClick={onClick} style={style}>
			{children}
		</div>
	);
};