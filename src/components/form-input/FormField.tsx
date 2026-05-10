import type { ReactNode } from "react";
import cn from "classnames";

export interface FormFieldProps {
	label?: ReactNode;
	required?: boolean;
	error?: string;
	helperText?: string;
	className?: string;
	children: ReactNode;
}

export const FormField = ({
	label,
	required,
	error,
	helperText,
	className,
	children,
}: FormFieldProps) => (
	<div className={cn("flex flex-col gap-1", className)}>
		{label && (
			<label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
				{label}
				{required && <span className="text-error-500 ml-0.5">*</span>}
			</label>
		)}
		{children}
		{helperText && !error && (
			<span className="text-xs text-neutral-400 dark:text-neutral-500">
				{helperText}
			</span>
		)}
		{error && (
			<span className="text-xs text-error-500">{error}</span>
		)}
	</div>
);
