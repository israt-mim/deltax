import { AutoComplete, type AutoCompleteProps } from "antd";
import { FormField } from "./FormField";

export interface FormAutoCompleteProps extends AutoCompleteProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormAutoComplete = ({ label, error, helperText, required, className, ...rest }: FormAutoCompleteProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<AutoComplete status={error ? "error" : undefined} {...rest} />
	</FormField>
);
