import { DatePicker, type DatePickerProps } from "antd";
import { FormField } from "./FormField";

export interface FormDatePickerProps extends DatePickerProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormDatePicker = ({ label, error, helperText, required, className, ...rest }: FormDatePickerProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<DatePicker status={error ? "error" : undefined} className="w-full" {...rest} />
	</FormField>
);
