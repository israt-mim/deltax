import { Slider, type SliderSingleProps } from "antd";
import { FormField } from "./FormField";

export interface FormSliderProps extends SliderSingleProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormSlider = ({ label, error, helperText, required, className, ...rest }: FormSliderProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Slider {...rest} />
	</FormField>
);
