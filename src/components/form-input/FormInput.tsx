import type { ReactNode } from "react";
import cn from "classnames";
import { Input, type InputProps } from "antd";
import { FormField } from "./FormField";

export interface FormInputProps extends InputProps {
	label?: ReactNode;
	error?: string;
	helperText?: string;
}

export const FormInput = ({
	label,
	error,
	helperText,
	required,
	className,
	classNames,
	...rest
}: FormInputProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Input
			status={error ? "error" : undefined}
			classNames={{
				...classNames,
				input: cn(
					"dark:bg-black-800 dark:text-neutral-100 dark:placeholder:text-neutral-500",
					classNames?.input
				),
				affixWrapper: cn(
					"dark:border-black-600 dark:bg-black-800 dark:text-neutral-100",
					classNames?.affixWrapper
				),
			}}
			{...rest}
		/>
	</FormField>
);
