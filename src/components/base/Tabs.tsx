import { useState, useRef, useEffect, useCallback } from "react";
import cn from "classnames";

export interface TabItem {
	key: string;
	label: React.ReactNode;
	disabled?: boolean;
}

export interface TabsProps {
	items: TabItem[];
	activeKey?: string;
	defaultActiveKey?: string;
	onChange?: (key: string) => void;
	variant?: "underline" | "pill";
	size?: "sm" | "md" | "lg";
	className?: string;
	/** underline only: active tab text classes (defaults to blue) */
	underlineActiveClassName?: string;
	/** underline only: sliding indicator bar classes (defaults to blue) */
	underlineIndicatorClassName?: string;
}

const PILL_SIZE_CLASSES = {
	sm: "px-2.5 py-1 text-xs",
	md: "px-4 py-1.5 text-sm",
	lg: "px-5 py-2 text-base",
} as const;

const UNDERLINE_SIZE_CLASSES = {
	sm: "px-3 py-1.5 text-xs",
	md: "px-4 py-2.5 text-sm",
	lg: "px-5 py-3 text-base",
} as const;

const UNDERLINE_INDICATOR_HEIGHT = {
	sm: "h-[1.5px]",
	md: "h-0.5",
	lg: "h-[3px]",
} as const;

export const Tabs = ({
	items,
	activeKey: controlledKey,
	defaultActiveKey,
	onChange,
	variant = "underline",
	size = "md",
	className,
	underlineActiveClassName,
	underlineIndicatorClassName,
}: TabsProps) => {
	const [internalKey, setInternalKey] = useState(
		defaultActiveKey ?? items[0]?.key ?? ""
	);
	const activeKey = controlledKey ?? internalKey;

	const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
	const tabsRef = useRef<HTMLDivElement>(null);
	const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	const updateIndicator = useCallback(() => {
		const el = tabRefs.current.get(activeKey);
		if (!el || !tabsRef.current) return;

		const containerRect = tabsRef.current.getBoundingClientRect();
		const tabRect = el.getBoundingClientRect();

		if (variant === "underline") {
			setIndicatorStyle({
				left: tabRect.left - containerRect.left,
				width: tabRect.width,
			});
		} else {
			setIndicatorStyle({
				left: tabRect.left - containerRect.left,
				width: tabRect.width,
				height: tabRect.height,
			});
		}
	}, [activeKey, variant]);

	useEffect(() => {
		updateIndicator();
	}, [updateIndicator]);

	const handleSelect = (key: string) => {
		if (controlledKey === undefined) {
			setInternalKey(key);
		}
		onChange?.(key);
	};

	if (variant === "pill") {
		return (
			<div
				ref={tabsRef}
				className={cn(
					"relative inline-flex items-center self-start rounded-lg bg-neutral-100 dark:bg-black-700 p-1 gap-0.5",
					className
				)}
			>
				<div
					className="absolute rounded-md bg-white dark:bg-black-500 shadow-sm transition-all duration-200 ease-out"
					style={indicatorStyle}
				/>

				{items.map((item) => (
					<button
						key={item.key}
						ref={(el) => {
							if (el) tabRefs.current.set(item.key, el);
						}}
						onClick={() => !item.disabled && handleSelect(item.key)}
						className={cn(
							"relative z-[1] font-medium rounded-md transition-colors duration-200",
							PILL_SIZE_CLASSES[size],
							activeKey === item.key
								? "text-neutral-900 dark:text-white"
								: "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300",
							item.disabled && "opacity-40 cursor-not-allowed"
						)}
						disabled={item.disabled}
					>
						{item.label}
					</button>
				))}
			</div>
		);
	}

	return (
		<div className={cn("relative", className)}>
			<div
				ref={tabsRef}
				className="flex items-center gap-1 border-b border-neutral-200 dark:border-black-600"
			>
				{items.map((item) => (
					<button
						key={item.key}
						ref={(el) => {
							if (el) tabRefs.current.set(item.key, el);
						}}
						onClick={() => !item.disabled && handleSelect(item.key)}
						className={cn(
							"font-medium transition-colors duration-200 whitespace-nowrap",
							UNDERLINE_SIZE_CLASSES[size],
							activeKey === item.key
								? underlineActiveClassName ?? "text-blue-600 dark:text-blue-400"
								: "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300",
							item.disabled && "opacity-40 cursor-not-allowed"
						)}
						disabled={item.disabled}
					>
						{item.label}
					</button>
				))}
			</div>

			<div
				className={cn(
					"absolute bottom-0 rounded-full transition-all duration-200 ease-out",
					underlineIndicatorClassName ?? "bg-blue-600 dark:bg-blue-400",
					UNDERLINE_INDICATOR_HEIGHT[size]
				)}
				style={indicatorStyle}
			/>
		</div>
	);
};
