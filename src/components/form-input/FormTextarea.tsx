import { Input } from "antd";
import { FormField } from "./FormField";

type TextAreaProps = React.ComponentProps<typeof Input.TextArea>;

export interface FormTextareaProps extends TextAreaProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormTextarea = ({ label, error, helperText, required, className, ...rest }: FormTextareaProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Input.TextArea status={error ? "error" : undefined} {...rest} />
	</FormField>
);
