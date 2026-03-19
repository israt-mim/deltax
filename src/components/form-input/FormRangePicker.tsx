import { DatePicker } from "antd";
import { FormField } from "./FormField";

const { RangePicker } = DatePicker;

type RangePickerProps = React.ComponentProps<typeof RangePicker>;

export interface FormRangePickerProps extends RangePickerProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormRangePicker = ({ label, error, helperText, required, className, ...rest }: FormRangePickerProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<RangePicker status={error ? "error" : undefined} className="w-full" {...rest} />
	</FormField>
);
