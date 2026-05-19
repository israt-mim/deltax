import type { ReactNode } from "react";
import { Select, type SelectProps } from "antd";
import { FormField } from "./FormField";
import { mergeFormSelectPopupProps } from "./formSelectPopupDefaults";

export interface FormSelectProps extends SelectProps {
	label?: ReactNode;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormSelect = ({ label, error, helperText, required, className, ...rest }: FormSelectProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Select status={error ? "error" : undefined} {...mergeFormSelectPopupProps(rest)} />
	</FormField>
);
