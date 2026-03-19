import { TimePicker, type TimePickerProps } from "antd";
import { FormField } from "./FormField";

export interface FormTimePickerProps extends TimePickerProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormTimePicker = ({ label, error, helperText, required, className, ...rest }: FormTimePickerProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<TimePicker status={error ? "error" : undefined} className="w-full" {...rest} />
	</FormField>
);
