import { Rate, type RateProps } from "antd";
import { FormField } from "./FormField";

export interface FormRateProps extends RateProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormRate = ({ label, error, helperText, required, className, ...rest }: FormRateProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Rate {...rest} />
	</FormField>
);
