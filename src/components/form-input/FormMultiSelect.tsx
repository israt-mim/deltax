import { Select, type SelectProps } from "antd";
import { FormField } from "./FormField";
import { mergeFormSelectPopupProps } from "./formSelectPopupDefaults";

export interface FormMultiSelectProps extends Omit<SelectProps, "mode"> {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormMultiSelect = ({ label, error, helperText, required, className, ...rest }: FormMultiSelectProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Select
			mode="multiple"
			status={error ? "error" : undefined}
			{...mergeFormSelectPopupProps(rest)}
		/>
	</FormField>
);
