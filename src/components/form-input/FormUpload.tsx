import { Upload, Button, type UploadProps } from "antd";
import { FormField } from "./FormField";

export interface FormUploadProps extends UploadProps {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
	buttonText?: string;
}

export const FormUpload = ({ label, error, helperText, required, className, buttonText = "Upload", children, ...rest }: FormUploadProps) => (
	<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
		<Upload {...rest}>
			{children ?? <Button>{buttonText}</Button>}
		</Upload>
	</FormField>
);
