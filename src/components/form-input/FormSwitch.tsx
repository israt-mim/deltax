import type { ReactNode } from "react";
import { Switch, type SwitchProps } from "antd";
import { FormField } from "./FormField";

export interface FormSwitchProps extends SwitchProps {
	label?: ReactNode;
	error?: string;
	helperText?: string;
	required?: boolean;
}

export const FormSwitch = ({ label, error, helperText, required, className, ...rest }: FormSwitchProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Switch {...rest} className="w-4" />
	</FormField>
);
