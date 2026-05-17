import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { FormInput, type FormInputProps } from "./FormInput";

export type SearchInputProps = Omit<FormInputProps, "prefix"> & {
	placeholder: string;
};

export function SearchInput({ placeholder, allowClear = true, ...rest }: SearchInputProps) {
	return (
		<FormInput
			allowClear={allowClear}
			prefix={
				<SearchOutlinedIcon
					sx={{ fontSize: 18 }}
					className="text-neutral-400 dark:text-neutral-500"
				/>
			}
			placeholder={placeholder}
			{...rest}
		/>
	);
}
