import { Input, type InputProps } from "antd";
import { FormField } from "./FormField";

export interface FormInputProps extends InputProps {
	label?: string;
	error?: string;
	helperText?: string;
}

export const FormInput = ({ label, error, helperText, required, className, ...rest }: FormInputProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Input status={error ? "error" : undefined} {...rest} />
	</FormField>
);
