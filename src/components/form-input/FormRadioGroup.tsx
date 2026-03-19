import { Radio, type RadioGroupProps } from "antd";
import { FormField } from "./FormField";

export interface FormRadioGroupProps extends RadioGroupProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormRadioGroup = ({ label, error, helperText, required, className, ...rest }: FormRadioGroupProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Radio.Group {...rest} />
	</FormField>
);
