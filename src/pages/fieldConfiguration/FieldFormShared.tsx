import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
} from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Input } from "antd";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { FormInput } from "../../components/form-input/FormInput";
import { FormCreatableSelect } from "../../components/form-input/FormCreatableSelect";
import { FormToggleField } from "../../components/form-input/FormToggleField";
import { FormSelect } from "../../components/form-input/FormSelect";
import { FormNumber } from "../../components/form-input/FormNumber";
import { FormDatePicker } from "../../components/form-input/FormDatePicker";
import type { FieldConfigurationApiDocument } from "../../api/services/fields";
import { useFieldContextOptionsQuery } from "../../api/hooks/fields";
import { GLOBAL_FIELD_CONTEXT } from "../../lib/fieldContext";

export const GROUP_OPTIONS = [
	{ value: "testGroup", label: "testGroup" },
	{ value: "sales", label: "Sales" },
	{ value: "procurement", label: "Procurement" },
	{ value: "hr", label: "HR" },
];

/** Derive immutable group technical name from the selected/entered group label. */
export function groupToTechnicalName(group: string): string {
	const trimmed = group.trim();
	if (!trimmed) return "";

	const known = GROUP_OPTIONS.find(
		(o) =>
			o.value === trimmed ||
			o.label === trimmed ||
			o.label.toLowerCase() === trimmed.toLowerCase()
	);
	if (known) return known.value;

	return trimmed
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.replace(/_+/g, "_");
}

/** @deprecated Use {@link useFieldContextOptionsQuery} — kept for tests/fallback. */
export const CONTEXT_OPTIONS = [{ value: GLOBAL_FIELD_CONTEXT, label: GLOBAL_FIELD_CONTEXT }];

function FieldContextSelect({
	value,
	onChange,
}: {
	value: string;
	onChange: (v: string) => void;
}) {
	const optionsQuery = useFieldContextOptionsQuery();
	const options =
		optionsQuery.data && optionsQuery.data.length > 0 ? optionsQuery.data : CONTEXT_OPTIONS;

	return (
		<FormCreatableSelect
			label="Context"
			allowCreate
			value={value}
			onChange={(val) => onChange(String(val ?? ""))}
			options={options}
			placeholder="Select context or type to create"
		/>
	);
}

export const FIELD_TYPE_OPTIONS = [
	{ value: "Header", label: "Header" },
	{ value: "Line Item", label: "Line Item" },
	{ value: "Modification", label: "Modification" },
	{ value: "Generic", label: "Generic" },
];

export const DATA_TYPES = [
	"Boolean",
	"Choice",
	"Currency",
	"Date",
	"DateTime",
	"Dynamic",
	"E-Mail",
	"Number",
	"String",
] as const;

export type DataType = (typeof DATA_TYPES)[number];

export const DATA_TYPE_OPTIONS = DATA_TYPES.map((t) => ({ value: t, label: t }));

/** Split pasted or entered values on `||` (e.g. one tag `a||b||c` → three options). */
export function normalizeChoiceOptions(raw: string[]): string[] {
	const out: string[] = [];
	for (const item of raw) {
		const parts = String(item)
			.split(/\s*\|\|\s*/)
			.map((s) => s.trim())
			.filter(Boolean);
		out.push(...(parts.length ? parts : item.trim() ? [item.trim()] : []));
	}
	return [...new Set(out)];
}

export type DetailsStepErrors = { name?: string; group?: string };
export type TypeStepErrors = { fieldType?: string; dataType?: string; fieldValues?: string };

export function validateDetailsStep(name: string, group: string): DetailsStepErrors {
	const e: DetailsStepErrors = {};
	if (!name.trim()) e.name = "Name is required";
	if (!group.trim()) e.group = "Group is required";
	return e;
}

export function validateTypeStep(fieldType: string, dataType: DataType, choiceOptions: string[]): TypeStepErrors {
	const e: TypeStepErrors = {};
	if (!fieldType.trim()) e.fieldType = "Field type is required";
	if (!dataType || !(DATA_TYPES as readonly string[]).includes(dataType)) {
		e.dataType = "Data type is required";
	}
	if (dataType === "Choice" && choiceOptions.length === 0) {
		e.fieldValues = "Add at least one field value";
	}
	return e;
}

export function emptyDefaultForDataType(type: DataType): string | number | boolean | Dayjs | null {
	switch (type) {
		case "String":
		case "Dynamic":
		case "E-Mail":
		case "Choice":
			return "";
		case "Number":
		case "Currency":
			return null;
		case "Boolean":
			return false;
		case "Date":
		case "DateTime":
			return null;
		default:
			return "";
	}
}

export function parseDefaultValueFromApi(
	dataType: DataType,
	value: unknown
): string | number | boolean | Dayjs | null {
	if (value === null || value === undefined) return emptyDefaultForDataType(dataType);
	if (dataType === "Date" || dataType === "DateTime") {
		const parsed = dayjs(String(value));
		return parsed.isValid() ? parsed : null;
	}
	if (dataType === "Boolean") return Boolean(value);
	if (dataType === "Number" || dataType === "Currency") {
		const n = typeof value === "number" ? value : Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return String(value);
}

export type FieldFormSetters = {
	setName: (v: string) => void;
	setGroup: (v: string) => void;
	setGroupTechName: (v: string) => void;
	setContext: (v: string) => void;
	setTags: (v: string[]) => void;
	setTooltip: (v: string) => void;
	setVisible: (v: boolean) => void;
	setRequired: (v: boolean) => void;
	setDisabled: (v: boolean) => void;
	setLocked: (v: boolean) => void;
	setFieldType: (v: string) => void;
	setDataType: (v: DataType) => void;
	setChoiceOptions: (v: string[]) => void;
	setChoiceDraft: (v: string) => void;
	setDefaultValue: (v: string | number | boolean | Dayjs | null) => void;
};

/** Hydrate create/edit form state from a field API document. */
export function applyFieldDocToForm(doc: FieldConfigurationApiDocument, setters: FieldFormSetters): void {
	const details = doc.details;
	const type = doc.type;
	const nextDataType = (DATA_TYPES.includes(type.dataType as DataType)
		? type.dataType
		: "String") as DataType;

	const groupName = details?.group ?? "";
	setters.setName(details?.name ?? "");
	setters.setGroup(groupName);
	setters.setGroupTechName(groupToTechnicalName(groupName));
	setters.setContext(details?.context ?? "");
	setters.setTags(Array.isArray(details?.tags) ? details.tags : []);
	setters.setTooltip(details?.tooltip ?? "");
	setters.setVisible(details?.visible !== false);
	setters.setRequired(Boolean(details?.required));
	setters.setDisabled(Boolean(details?.disabled));
	setters.setLocked(Boolean(details?.locked));
	setters.setFieldType(type?.fieldType ?? "Generic");
	setters.setDataType(nextDataType);
	setters.setChoiceOptions(Array.isArray(type?.choiceOptions) ? type.choiceOptions : []);
	setters.setChoiceDraft("");
	setters.setDefaultValue(parseDefaultValueFromApi(nextDataType, type?.defaultValue));
}

export type DetailsStepProps = {
	name: string;
	onNameChange: (v: string) => void;
	group: string;
	onGroupChange: (v: string) => void;
	groupTechName: string;
	onGroupTechNameChange: (v: string) => void;
	context: string;
	onContextChange: (v: string) => void;
	tags: string[];
	onTagsChange: (v: string[]) => void;
	errors?: DetailsStepErrors;
	tooltip: string;
	onTooltipChange: (v: string) => void;
	visible: boolean;
	onVisibleChange: (v: boolean) => void;
	required: boolean;
	onRequiredChange: (v: boolean) => void;
	disabled: boolean;
	onDisabledChange: (v: boolean) => void;
	locked: boolean;
	onLockedChange: (v: boolean) => void;
};

export const DetailsStep = ({
	name,
	onNameChange,
	group,
	onGroupChange,
	groupTechName,
	onGroupTechNameChange,
	context,
	onContextChange,
	tags,
	onTagsChange,
	errors,
	tooltip,
	onTooltipChange,
	visible,
	onVisibleChange,
	required,
	onRequiredChange,
	disabled,
	onDisabledChange,
	locked,
	onLockedChange,
}: DetailsStepProps) => {
	return (
		<div className="flex flex-col gap-5">
			<div className="grid grid-cols-2 gap-x-8 gap-y-4">
				<FormInput
					label="Name"
					required
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					placeholder="Enter name"
					error={errors?.name}
				/>
				<FormCreatableSelect
					label="Group"
					required
					allowCreate
					value={group}
					onChange={(val) => {
						const nextGroup = String(val ?? "");
						onGroupChange(nextGroup);
						onGroupTechNameChange(groupToTechnicalName(nextGroup));
					}}
					options={GROUP_OPTIONS}
					placeholder="Select group"
					error={errors?.group}
				/>
				<FormInput
					label="Group technical name"
					value={groupTechName}
					readOnly
					disabled
					placeholder="Generated from group"
					classNames={{
						input: "cursor-not-allowed text-neutral-600 dark:text-neutral-400",
					}}
				/>
				<FieldContextSelect value={context} onChange={onContextChange} />
			</div>

			<FormCreatableSelect
				label="Tags"
				tags
				multiple
				value={tags}
				onChange={(val) => onTagsChange(val as string[])}
				placeholder="Select an option or create one"
				options={[
					{ value: "REQUIRED", label: "REQUIRED" },
					{ value: "CUSTOM", label: "CUSTOM" },
					{ value: "SYSTEM", label: "SYSTEM" },
				]}
			/>

			<FormInput
				label="Tooltip"
				value={tooltip}
				onChange={(e) => onTooltipChange(e.target.value)}
				placeholder="Enter tooltip"
			/>

			<div className="grid grid-cols-4 gap-6 pt-2">
				<FormToggleField label="Visible" checked={visible} onChange={onVisibleChange} />
				<FormToggleField label="Required" checked={required} onChange={onRequiredChange} />
				<FormToggleField label="Disabled" checked={disabled} onChange={onDisabledChange} />
				<FormToggleField
					label="Locked"
					checked={locked}
					onChange={onLockedChange}
					icon={<LockOutlinedIcon sx={{ fontSize: 12 }} />}
				/>
			</div>
		</div>
	);
};

export type TypeStepProps = {
	fieldType: string;
	onFieldTypeChange: (v: string) => void;
	dataType: DataType;
	onDataTypeChange: (value: string | undefined) => void;
	choiceOptions: string[];
	setChoiceOptions: Dispatch<SetStateAction<string[]>>;
	choiceDraft: string;
	setChoiceDraft: (v: string) => void;
	defaultValue: string | number | boolean | Dayjs | null;
	setDefaultValue: Dispatch<SetStateAction<string | number | boolean | Dayjs | null>>;
	commitChoiceDraft: () => void;
	errors?: TypeStepErrors;
};

export const TypeStep = ({
	fieldType,
	onFieldTypeChange,
	dataType,
	onDataTypeChange,
	choiceOptions,
	setChoiceOptions,
	choiceDraft,
	setChoiceDraft,
	defaultValue,
	setDefaultValue,
	commitChoiceDraft,
	errors,
}: TypeStepProps) => {
	const renderDefaultValue = () => {
		switch (dataType) {
			case "String":
			case "Dynamic":
				return (
					<FormInput
						label="Default Value"
						value={typeof defaultValue === "string" ? defaultValue : ""}
						onChange={(e) => setDefaultValue(e.target.value)}
						placeholder="Enter"
					/>
				);
			case "E-Mail":
				return (
					<FormInput
						label="Default Value"
						type="email"
						value={typeof defaultValue === "string" ? defaultValue : ""}
						onChange={(e) => setDefaultValue(e.target.value)}
						placeholder="Enter email"
					/>
				);
			case "Number":
			case "Currency":
				return (
					<FormNumber
						label="Default Value"
						value={typeof defaultValue === "number" ? defaultValue : null}
						onChange={(v) => setDefaultValue(v ?? null)}
						placeholder="Enter"
						{...(dataType === "Currency" ? { prefix: "$" } : {})}
					/>
				);
			case "Boolean":
				return (
					<FormSelect
						label="Default Value"
						placeholder="Select"
						value={
							typeof defaultValue === "boolean" ? (defaultValue ? "true" : "false") : undefined
						}
						onChange={(v) => setDefaultValue(v === "true")}
						options={[
							{ value: "true", label: "Yes" },
							{ value: "false", label: "No" },
						]}
					/>
				);
			case "Choice": {
				const choiceSelectOptions = choiceOptions.map((v) => ({ value: v, label: v }));
				return (
					<>
						<div className="flex flex-col gap-1">
							<label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Field Values
								<span className="text-error-500 ml-0.5">*</span>
							</label>
							<div className="flex flex-col gap-1">
								<div className="flex gap-2 items-center">
									<Input
										className="flex-1 min-w-0"
										status={errors?.fieldValues ? "error" : undefined}
										value={choiceDraft}
										onChange={(e) => setChoiceDraft(e.target.value)}
										onPressEnter={() => commitChoiceDraft()}
										placeholder="Press Enter to add a value and use || to separate multiple values"
									/>
									<button
										type="button"
										onClick={() => {
											setChoiceOptions([]);
											setChoiceDraft("");
											setDefaultValue("");
										}}
										className="shrink-0 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
									>
										Clear All
									</button>
								</div>
								{errors?.fieldValues && (
									<span className="text-xs text-error-500">{errors.fieldValues}</span>
								)}
							</div>
							{choiceOptions.length > 0 && (
								<div className="grid grid-cols-2 gap-1.5 pt-2">
									{choiceOptions.map((v, i) => (
										<div
											key={`${i}-${v}`}
											className="flex h-6 min-w-0 w-full items-center justify-between gap-0.5 rounded-md bg-primary-50 px-1.5 text-[11px] font-medium leading-none text-primary-800 shadow-sm dark:bg-primary-950/55 dark:text-primary-100 dark:shadow-none"
										>
											<span className="min-w-0 flex-1 truncate pr-0.5">{v}</span>
											<button
												type="button"
												onClick={() => setChoiceOptions((prev) => prev.filter((_, idx) => idx !== i))}
												className="-mr-0.5 flex size-4 shrink-0 items-center justify-center rounded text-primary-500 transition-colors hover:bg-primary-100/80 hover:text-primary-900 dark:text-primary-400 dark:hover:bg-primary-900/50 dark:hover:text-primary-50"
												aria-label={`Remove ${v}`}
											>
												<CloseOutlinedIcon sx={{ fontSize: 12 }} />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
						<FormSelect
							label="Default Value"
							placeholder={choiceOptions.length ? "Select" : "Add field values first"}
							value={typeof defaultValue === "string" && defaultValue ? defaultValue : undefined}
							onChange={(v) => setDefaultValue(v === undefined || v === null ? "" : String(v))}
							options={choiceSelectOptions}
							showSearch
							optionFilterProp="label"
							allowClear
							disabled={choiceOptions.length === 0}
						/>
					</>
				);
			}
			case "Date":
			case "DateTime":
				return (
					<FormDatePicker
						label="Default Value"
						value={defaultValue !== null && dayjs.isDayjs(defaultValue) ? defaultValue : undefined}
						onChange={(d) => {
							const next = Array.isArray(d) ? (d[0] ?? null) : (d ?? null);
							setDefaultValue(next);
						}}
						placeholder="Select"
						showTime={dataType === "DateTime"}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col gap-5">
			<div className="grid grid-cols-2 gap-x-8 gap-y-4">
				<FormSelect
					label="Field Type"
					required
					options={FIELD_TYPE_OPTIONS}
					value={fieldType}
					onChange={(v) => onFieldTypeChange(String(v ?? ""))}
					placeholder="Select field type"
					showSearch
					optionFilterProp="label"
					suffixIcon={<SearchOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-400" />}
					error={errors?.fieldType}
				/>
				<FormSelect
					label="Data Type"
					required
					options={DATA_TYPE_OPTIONS}
					value={dataType}
					onChange={onDataTypeChange}
					placeholder="Select data type"
					showSearch
					optionFilterProp="label"
					allowClear
					error={errors?.dataType}
				/>
			</div>

			{renderDefaultValue()}
		</div>
	);
};

function ReadOnlyField({
	label,
	children,
	required: isRequired,
}: {
	label: string;
	children: ReactNode;
	required?: boolean;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
				{label}
				{isRequired ? <span className="text-error-500 ml-0.5">*</span> : null}
			</span>
			<div className="text-sm text-neutral-900 dark:text-neutral-100">{children}</div>
		</div>
	);
}

export function FieldDetailsSectionReadOnly({
	name,
	group,
	groupTechName,
	context,
	tags,
	tooltip,
	visible,
	required,
	disabled,
	locked,
}: {
	name: string;
	group: string;
	groupTechName: string;
	context: string;
	tags: string[];
	tooltip: string;
	visible: boolean;
	required: boolean;
	disabled: boolean;
	locked: boolean;
}) {
	const yn = (v: boolean) => (v ? "Yes" : "No");
	const dash = (s: string) => (s.trim() ? s : "—");

	return (
		<div className="flex flex-col gap-6">
			{/* Matches create form: 2×2, then full-width Tags / Tooltip */}
			<div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 sm:gap-y-5">
				<ReadOnlyField label="Name" required>
					{dash(name)}
				</ReadOnlyField>
				<ReadOnlyField label="Group" required>
					{dash(group)}
				</ReadOnlyField>
				<ReadOnlyField label="Group technical name">{dash(groupTechName)}</ReadOnlyField>
				<ReadOnlyField label="Context">{dash(context)}</ReadOnlyField>
				<div className="min-w-0 sm:col-span-2">
					<ReadOnlyField label="Tags">
						{tags.length ? (
							<div className="flex flex-wrap gap-1">
								{tags.map((t) => (
									<span
										key={t}
										className="rounded-md bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900 dark:text-warning-300"
									>
										{t}
									</span>
								))}
							</div>
						) : (
							"—"
						)}
					</ReadOnlyField>
				</div>
				<div className="min-w-0 sm:col-span-2">
					<ReadOnlyField label="Tooltip">{dash(tooltip)}</ReadOnlyField>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
				<ReadOnlyField label="Visible">{yn(visible)}</ReadOnlyField>
				<ReadOnlyField label="Required">{yn(required)}</ReadOnlyField>
				<ReadOnlyField label="Disabled">{yn(disabled)}</ReadOnlyField>
				<ReadOnlyField label="Locked">{yn(locked)}</ReadOnlyField>
			</div>
		</div>
	);
}

export function FieldTypesSectionReadOnly({
	fieldType,
	dataType,
	choiceOptions,
	defaultValueDisplay,
}: {
	fieldType: string;
	dataType: string;
	choiceOptions: string[];
	defaultValueDisplay: string;
}) {
	const dash = (s: string) => (s.trim() ? s : "—");

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
				<ReadOnlyField label="Field Type">{dash(fieldType)}</ReadOnlyField>
				<ReadOnlyField label="Data Type">{dash(dataType)}</ReadOnlyField>
			</div>
			{dataType === "Choice" && choiceOptions.length > 0 && (
				<ReadOnlyField label="Field Values">
					<div className="flex flex-wrap gap-1">
						{choiceOptions.map((t) => (
							<span
								key={t}
								className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-950/55 dark:text-primary-100"
							>
								{t}
							</span>
						))}
					</div>
				</ReadOnlyField>
			)}
			<ReadOnlyField label="Default Value">{defaultValueDisplay}</ReadOnlyField>
		</div>
	);
}
