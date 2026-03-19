import { Input, type InputProps } from "antd";
import { FormField } from "./FormField";

type PasswordProps = React.ComponentProps<typeof Input.Password>;

export interface FormPasswordProps extends PasswordProps {
	label?: string;
	error?: string;
	helperText?: string;
}

export const FormPassword = ({ label, error, helperText, required, className, ...rest }: FormPasswordProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Input.Password status={error ? "error" : undefined} {...rest} />
	</FormField>
);
