import { useMemo, useState } from "react";
import { Select, type SelectProps } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import cn from "classnames";
import { FormField } from "./FormField";
import { mergeFormSelectPopupProps } from "./formSelectPopupDefaults";

const CREATE_TOKEN_PREFIX = "__create__:";

function createOptionToken(input: string): string {
	return `${CREATE_TOKEN_PREFIX}${encodeURIComponent(input.trim())}`;
}

function parseCreateOptionToken(value: string): string | null {
	if (!value.startsWith(CREATE_TOKEN_PREFIX)) return null;
	try {
		return decodeURIComponent(value.slice(CREATE_TOKEN_PREFIX.length));
	} catch {
		return null;
	}
}

function flattenOptions(opts: SelectProps["options"]): DefaultOptionType[] {
	if (!opts?.length) return [];
	const out: DefaultOptionType[] = [];
	for (const o of opts) {
		if (typeof o === "string" || typeof o === "number") {
			out.push({ value: o, label: o });
		} else if (o && "options" in o && Array.isArray(o.options)) {
			out.push(...flattenOptions(o.options));
		} else if (o && "value" in o) {
			out.push(o as DefaultOptionType);
		}
	}
	return out;
}

function optionMatchesSearch(o: DefaultOptionType, q: string): boolean {
	const lower = q.toLowerCase();
	return (
		String(o.value).toLowerCase().includes(lower) ||
		String(o.label ?? "").toLowerCase().includes(lower)
	);
}

export type FormCreatableSelectProps = Omit<SelectProps, "mode"> & {
	label?: string;
	error?: string;
	helperText?: string;
	required?: boolean;
	multiple?: boolean;
	tags?: boolean;
	allowCreate?: boolean;
};

type CreatableSingleProps = Omit<
	FormCreatableSelectProps,
	"multiple" | "tags" | "allowCreate" | "maxCount"
>;

function CreatableSingleSelect(props: CreatableSingleProps) {
	const {
		label,
		error,
		helperText,
		required,
		className,
		options: optionsProp,
		value,
		onChange,
		placeholder,
		disabled,
		allowClear,
		size,
		id,
		style,
		onOpenChange: onOpenChangeProp,
		onSearch: onSearchProp,
		...rawRest
	} = props;

	const { filterOption: _filterOption, showSearch: _showSearch, ...selectRest } = rawRest;

	const [search, setSearch] = useState("");

	const normalized = useMemo(() => flattenOptions(optionsProp), [optionsProp]);

	const mergedOptions = useMemo(() => {
		const q = search.trim();
		const valueStr = value !== undefined && value !== null && value !== "" ? String(value) : "";

		const hasExactInBase = normalized.some((o) => String(o.value).toLowerCase() === q.toLowerCase());

		const filtered =
			q === "" ? normalized : normalized.filter((o) => optionMatchesSearch(o, q));

		const valuePicked =
			valueStr &&
			!normalized.some((o) => String(o.value) === valueStr) &&
			!filtered.some((o) => String(o.value) === valueStr)
				? [{ value: valueStr, label: valueStr }]
				: [];

		const withCustom = [...filtered, ...valuePicked];

		if (q && !hasExactInBase) {
			return [
				{
					value: createOptionToken(q),
					label: `Create "${q}"`,
				},
				...withCustom,
			];
		}

		return withCustom;
	}, [search, normalized, value]);

	const handleChange: SelectProps["onChange"] = (v, option) => {
		const raw = v === undefined || v === null ? undefined : String(v);
		const created = raw ? parseCreateOptionToken(raw) : null;
		const next = created !== null ? created : raw;
		onChange?.(next as never, option as never);
		setSearch("");
	};

	const popupProps = mergeFormSelectPopupProps(selectRest);

	return (
		<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
			<Select
				{...popupProps}
				className={cn("w-full min-w-0", popupProps.className)}
				options={mergedOptions}
				value={value === undefined || value === null || value === "" ? undefined : value}
				onChange={handleChange}
				onSearch={(q) => {
					setSearch(q);
					onSearchProp?.(q);
				}}
				onOpenChange={(open) => {
					onOpenChangeProp?.(open);
					if (!open) setSearch("");
				}}
				showSearch
				filterOption={false}
				placeholder={placeholder}
				disabled={disabled}
				allowClear={allowClear}
				size={size}
				id={id}
				style={style}
				status={error ? "error" : undefined}
			/>
		</FormField>
	);
}

export const FormCreatableSelect = ({
	label,
	error,
	helperText,
	required,
	className,
	multiple = false,
	tags = false,
	allowCreate = false,
	maxCount,
	...rest
}: FormCreatableSelectProps) => {
	const useCreatableDropdown = allowCreate && !tags && !multiple;

	if (useCreatableDropdown) {
		return (
			<CreatableSingleSelect
				label={label}
				error={error}
				helperText={helperText}
				required={required}
				className={className}
				{...rest}
			/>
		);
	}

	const mode = tags || (allowCreate && multiple) ? "tags" : multiple ? "multiple" : undefined;
	const resolvedMaxCount =
		mode === "tags" && !multiple
			? maxCount !== undefined
				? maxCount
				: 1
			: maxCount;

	return (
		<FormField label={label} error={error} helperText={helperText} required={required} className={className}>
			<Select
				{...mergeFormSelectPopupProps(rest)}
				mode={mode}
				maxCount={resolvedMaxCount}
				status={error ? "error" : undefined}
			/>
		</FormField>
	);
};
