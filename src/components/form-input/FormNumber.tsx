import { InputNumber, type InputNumberProps } from "antd";
import { FormField } from "./FormField";

export interface FormNumberProps extends InputNumberProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormNumber = ({ label, error, helperText, required, className, ...rest }: FormNumberProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<InputNumber status={error ? "error" : undefined} className="w-full" {...rest} />
	</FormField>
);
