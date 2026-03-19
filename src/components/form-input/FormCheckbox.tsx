import { Checkbox, type CheckboxProps } from "antd";
import { FormField } from "./FormField";

export interface FormCheckboxProps extends CheckboxProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormCheckbox = ({ label, error, helperText, required, className, children, ...rest }: FormCheckboxProps) => (
	<FormField error={error} helperText={helperText} required={required} className={className}>
		<Checkbox {...rest}>{label ?? children}</Checkbox>
	</FormField>
);
