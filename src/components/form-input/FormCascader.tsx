import { Cascader } from "antd";
import { FormField } from "./FormField";

type CascaderBaseProps = React.ComponentProps<typeof Cascader>;

export type FormCascaderProps = CascaderBaseProps & {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
};

export const FormCascader = ({ label, error, helperText, required, className, ...rest }: FormCascaderProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Cascader status={error ? "error" : undefined} className="w-full" {...rest} />
	</FormField>
);
