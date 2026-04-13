import { forwardRef, type ButtonHTMLAttributes } from "react";
import cn from "classnames";

type ButtonSize = "xl" | "lg" | "md" | "sm" | "xs";
type ButtonAppearance = "filled" | "outlined" | "rounded";
type ButtonStatus = "primary" | "secondary" | "secondary-neutral" | "no-bg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	size?: ButtonSize;
	appearance?: ButtonAppearance;
	status?: ButtonStatus;
	loading?: boolean;
	fullWidth?: boolean;
	classNames?: {
		icon?: string;
	};
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
	xl: "h-10 px-4 text-sm gap-2",
	lg: "h-9 px-3.5 text-sm gap-1.5",
	md: "h-8 px-3 text-xs gap-1.5",
	sm: "h-7 px-2.5 text-xs gap-1",
	xs: "h-6 px-2 text-[11px] gap-1",
};

const SPINNER_SIZE: Record<ButtonSize, number> = {
	xl: 16,
	lg: 15,
	md: 14,
	sm: 13,
	xs: 12,
};

const STATUS_FILLED: Record<ButtonStatus, string> = {
	primary:
		"bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 dark:bg-primary-400 dark:hover:bg-primary-500 dark:active:bg-primary-600",
	secondary:
		"bg-primary-50 text-primary-600 hover:bg-primary-100 active:bg-primary-150 dark:bg-primary-900 dark:text-primary-200 dark:hover:bg-primary-850 dark:active:bg-primary-800",
	"secondary-neutral":
		"bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-black-600 dark:text-neutral-200 dark:hover:bg-black-500 dark:active:bg-black-400",
	"no-bg":
		"bg-transparent text-primary-500 hover:bg-primary-50 active:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-950 dark:active:bg-primary-900",
};

const STATUS_OUTLINED: Record<ButtonStatus, string> = {
	primary:
		"border border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-950 dark:active:bg-primary-900",
	secondary:
		"border border-primary-200 text-primary-600 hover:bg-primary-50 active:bg-primary-100 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950 dark:active:bg-primary-900",
	"secondary-neutral":
		"border border-neutral-300 text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 dark:border-black-500 dark:text-neutral-300 dark:hover:bg-black-700 dark:active:bg-black-600",
	"no-bg":
		"border-0 bg-transparent text-primary-500 hover:bg-primary-50 active:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-950 dark:active:bg-primary-900",
};

function getVariantClasses(appearance: ButtonAppearance, status: ButtonStatus): string {
	if (appearance === "outlined") return STATUS_OUTLINED[status];
	return STATUS_FILLED[status];
}

const Spinner = ({ size }: { size: number }) => (
	<svg
		className="animate-spin"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<circle
			cx="12"
			cy="12"
			r="10"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="round"
			className="opacity-25"
		/>
		<path
			d="M12 2a10 10 0 0 1 10 10"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="round"
			className="opacity-75"
		/>
	</svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			size = "md",
			appearance = "filled",
			status = "primary",
			loading = false,
			fullWidth = false,
			disabled,
			className,
			classNames,
			children,
			...rest
		},
		ref
	) => {
		const isDisabled = disabled || loading;

		return (
			<button
				ref={ref}
				disabled={isDisabled}
				className={cn(
					"inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1",
					SIZE_CLASSES[size],
					getVariantClasses(appearance, status),
					appearance === "rounded" ? "rounded-full" : "rounded-lg",
					fullWidth && "w-full",
					isDisabled && "opacity-50 pointer-events-none",
					classNames?.icon,
					className
				)}
				{...rest}
			>
				{loading && <Spinner size={SPINNER_SIZE[size]} />}
				{children}
			</button>
		);
	}
);

Button.displayName = "Button";
