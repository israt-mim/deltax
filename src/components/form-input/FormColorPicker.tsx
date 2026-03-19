import { ColorPicker, type ColorPickerProps } from "antd";
import { FormField } from "./FormField";

export interface FormColorPickerProps extends ColorPickerProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormColorPicker = ({ label, error, helperText, required, className, ...rest }: FormColorPickerProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<ColorPicker {...rest} />
	</FormField>
);
