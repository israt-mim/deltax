import { Children, type ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { buildFieldConfigurationCreateBody } from "../api/services/fields";
import { useCreateFieldMutation } from "../api/hooks/fields";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Typography } from "../components/base/Typography";
import { Stepper, type StepperStep } from "../components/base/Stepper";
import { Button } from "../components/base/Button";
import {
	type DataType,
	DetailsStep,
	TypeStep,
	emptyDefaultForDataType,
	normalizeChoiceOptions,
	validateDetailsStep,
	validateTypeStep,
	type DetailsStepErrors,
	type TypeStepErrors,
} from "./fieldConfiguration/FieldFormShared";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";

const STEPS: StepperStep[] = [
	{ key: "details", label: "Details" },
	{ key: "type", label: "Type" },
	{ key: "preview", label: "Preview" },
];

function formatDefaultValueForPreview(
	dataType: DataType,
	defaultValue: string | number | boolean | Dayjs | null
): string {
	if (defaultValue === null || defaultValue === undefined) return "—";
	if (dataType === "Boolean") return defaultValue === true ? "True" : "False";
	if (dayjs.isDayjs(defaultValue)) {
		return defaultValue.format(dataType === "DateTime" ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD");
	}
	if (typeof defaultValue === "number") return String(defaultValue);
	const s = String(defaultValue);
	return s.trim() ? s : "—";
}

function PreviewTagList({ items }: { items: string[] }) {
	if (!items.length) return "—";
	return (
		<div className="flex flex-wrap gap-1.5">
			{items.map((t, i) => (
				<span
					key={`${i}-${t}`}
					className="inline-flex max-w-full items-center rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-medium leading-none text-primary-800 shadow-sm dark:bg-primary-950/55 dark:text-primary-100 dark:shadow-none"
				>
					<span className="truncate">{t}</span>
				</span>
			))}
		</div>
	);
}

/** One field in the preview grid: label + value stacked inside a tile. */
function PreviewRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="flex min-h-[4.25rem] flex-col gap-1.5 px-4 py-3">
			<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
			<div className="min-w-0 flex-1 text-sm leading-snug break-words text-neutral-900 dark:text-neutral-100">
				{value}
			</div>
		</div>
	);
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<Typography
				size="extra-small"
				variant="semibold"
				appearance="custom"
				className="uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
			>
				{title}
			</Typography>
			<Card className="!border-0 overflow-hidden p-0 shadow-none">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
					{Children.map(children, (child, i) => (
						<div key={i} className="min-w-0">
							{child}
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}

type PreviewStepProps = {
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
	fieldType: string;
	dataType: DataType;
	choiceOptions: string[];
	defaultValue: string | number | boolean | Dayjs | null;
};

const PreviewStep = ({
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
	fieldType,
	dataType,
	choiceOptions,
	defaultValue,
}: PreviewStepProps) => {
	const yn = (v: boolean) => (v ? "Yes" : "No");

	return (
		<div className="flex flex-col gap-6">
			<PreviewSection title="Details">
				<PreviewRow label="Name" value={name || "—"} />
				<PreviewRow label="Group" value={group || "—"} />
				<PreviewRow label="Group technical name" value={groupTechName || "—"} />
				<PreviewRow label="Context" value={context || "—"} />
				<PreviewRow label="Tags" value={<PreviewTagList items={tags} />} />
				<PreviewRow label="Tooltip" value={tooltip.trim() ? tooltip : "—"} />
				<PreviewRow label="Visible" value={yn(visible)} />
				<PreviewRow label="Required" value={yn(required)} />
				<PreviewRow label="Disabled" value={yn(disabled)} />
				<PreviewRow label="Locked" value={yn(locked)} />
			</PreviewSection>

			<PreviewSection title="Type">
				<PreviewRow label="Field Type" value={fieldType || "—"} />
				<PreviewRow label="Data Type" value={dataType || "—"} />
				{dataType === "Choice" && (
					<PreviewRow label="Field Values" value={<PreviewTagList items={choiceOptions} />} />
				)}
				<PreviewRow
					label="Default Value"
					value={formatDefaultValueForPreview(dataType, defaultValue)}
				/>
			</PreviewSection>
		</div>
	);
};

const CreateFieldConfiguration = () => {
	usePageBreadcrumb([
		crumb("Configure", "/configure"),
		crumb("Fields", "/configure/fields"),
		crumb("New Field Configuration"),
	]);

	const navigate = useNavigate();
	const [activeStep, setActiveStep] = useState(0);

	const [name, setName] = useState("");
	const [group, setGroup] = useState("");
	const [groupTechName, setGroupTechName] = useState("");
	const [context, setContext] = useState("Global");
	const [tags, setTags] = useState<string[]>([]);
	const [tooltip, setTooltip] = useState("");
	const [visible, setVisible] = useState(true);
	const [required, setRequired] = useState(false);
	const [disabled, setDisabled] = useState(false);
	const [locked, setLocked] = useState(false);

	const [fieldType, setFieldType] = useState("Generic");
	const [dataType, setDataType] = useState<DataType>("String");
	const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
	const [choiceDraft, setChoiceDraft] = useState("");
	const [defaultValue, setDefaultValue] = useState<string | number | boolean | Dayjs | null>(() =>
		emptyDefaultForDataType("String")
	);

	const [detailsErrors, setDetailsErrors] = useState<DetailsStepErrors>({});
	const [typeErrors, setTypeErrors] = useState<TypeStepErrors>({});

	const createFieldMutation = useCreateFieldMutation();

	const handleDataTypeChange = useCallback((value: string | undefined) => {
		const next = (value ?? "String") as DataType;
		setDataType(next);
		setDefaultValue(emptyDefaultForDataType(next));
		setChoiceOptions([]);
		setChoiceDraft("");
		setTypeErrors((prev) => ({ ...prev, dataType: undefined, fieldValues: undefined }));
	}, []);

	const commitChoiceDraft = useCallback(() => {
		const parsed = normalizeChoiceOptions([choiceDraft]);
		if (!parsed.length) return;
		setChoiceOptions((prev) => [...new Set([...prev, ...parsed])]);
		setChoiceDraft("");
		setTypeErrors((prev) => ({ ...prev, fieldValues: undefined }));
	}, [choiceDraft]);

	useEffect(() => {
		if (dataType !== "Choice") return;
		setDefaultValue((prev) => {
			if (typeof prev !== "string" || !prev) return prev;
			return choiceOptions.includes(prev) ? prev : "";
		});
	}, [dataType, choiceOptions]);

	const isFirst = activeStep === 0;
	const isLast = activeStep === STEPS.length - 1;

	const handlePrimaryAction = useCallback(async () => {
		const saveField = async () => {
			const payload = buildFieldConfigurationCreateBody({
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
				fieldType,
				dataType,
				choiceOptions,
				defaultValue,
			});
			await createFieldMutation.mutateAsync(payload);
			toast.success("Field configuration created.");
			void navigate("/configure/fields");
		};

		if (activeStep === 0) {
			const err = validateDetailsStep(name, group);
			if (Object.keys(err).length > 0) {
				setDetailsErrors(err);
				toast.error("Please fill out all mandatory fields.");
				return;
			}
			setDetailsErrors({});
			setActiveStep(1);
			return;
		}
		if (activeStep === 1) {
			const err = validateTypeStep(fieldType, dataType, choiceOptions);
			if (Object.keys(err).length > 0) {
				setTypeErrors(err);
				toast.error("Please fill out all mandatory fields.");
				return;
			}
			setTypeErrors({});
			setActiveStep(2);
			return;
		}
		const de = validateDetailsStep(name, group);
		const te = validateTypeStep(fieldType, dataType, choiceOptions);
		if (Object.keys(de).length > 0 || Object.keys(te).length > 0) {
			setDetailsErrors(de);
			setTypeErrors(te);
			setActiveStep(Object.keys(de).length > 0 ? 0 : 1);
			toast.error("Please fix the errors before saving.");
			return;
		}
		try {
			await saveField();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not save field configuration."));
		}
	}, [
		activeStep,
		choiceOptions,
		createFieldMutation,
		dataType,
		defaultValue,
		disabled,
		context,
		fieldType,
		group,
		groupTechName,
		locked,
		name,
		navigate,
		required,
		tags,
		tooltip,
		visible,
	]);

	const detailsStepContent = (
		<DetailsStep
			name={name}
			onNameChange={(v) => {
				setName(v);
				setDetailsErrors((prev) => ({ ...prev, name: undefined }));
			}}
			group={group}
			onGroupChange={(v) => {
				setGroup(v);
				setDetailsErrors((prev) => ({ ...prev, group: undefined }));
			}}
			groupTechName={groupTechName}
			onGroupTechNameChange={setGroupTechName}
			context={context}
			onContextChange={setContext}
			tags={tags}
			onTagsChange={setTags}
			errors={detailsErrors}
			tooltip={tooltip}
			onTooltipChange={setTooltip}
			visible={visible}
			onVisibleChange={setVisible}
			required={required}
			onRequiredChange={setRequired}
			disabled={disabled}
			onDisabledChange={setDisabled}
			locked={locked}
			onLockedChange={setLocked}
		/>
	);

	const typeStepContent = (
		<TypeStep
			fieldType={fieldType}
			onFieldTypeChange={(v) => {
				setFieldType(v);
				setTypeErrors((prev) => ({ ...prev, fieldType: undefined }));
			}}
			dataType={dataType}
			onDataTypeChange={handleDataTypeChange}
			choiceOptions={choiceOptions}
			setChoiceOptions={(action) => {
				setChoiceOptions(action);
				setTypeErrors((prev) => ({ ...prev, fieldValues: undefined }));
			}}
			choiceDraft={choiceDraft}
			setChoiceDraft={setChoiceDraft}
			defaultValue={defaultValue}
			setDefaultValue={setDefaultValue}
			commitChoiceDraft={commitChoiceDraft}
			errors={typeErrors}
		/>
	);

	const renderStep = () => {
		switch (activeStep) {
			case 0:
				return detailsStepContent;
			case 1:
				return typeStepContent;
			case 2:
				return (
					<PreviewStep
						name={name}
						group={group}
						groupTechName={groupTechName}
						context={context}
						tags={tags}
						tooltip={tooltip}
						visible={visible}
						required={required}
						disabled={disabled}
						locked={locked}
						fieldType={fieldType}
						dataType={dataType}
						choiceOptions={choiceOptions}
						defaultValue={defaultValue}
					/>
				);
			default:
				return null;
		}
	};

	const submitPending = createFieldMutation.isPending;

	return (
		<CardMain className="flex flex-col h-full">
			<div className="flex flex-col gap-6 flex-1">
				<Title>New Field Configuration</Title>
				<Stepper steps={STEPS} activeStep={activeStep} className="w-full mx-auto" />
				<div className="flex-1 pt-2">{renderStep()}</div>
			</div>

			<div className="flex items-center justify-between border-t border-neutral-200 dark:border-black-600 pt-4 mt-6 -mx-6 px-6">
				<button
					onClick={() => navigate(-1)}
					className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-200 transition-colors"
				>
					Cancel
				</button>

				<div className="flex items-center gap-3">
					{!isFirst && (
						<Button
							size="md"
							status="secondary-neutral"
							appearance="outlined"
							onClick={() => {
								setActiveStep((s) => s - 1);
								if (activeStep === 1) setTypeErrors({});
								if (activeStep === 2) {
									setDetailsErrors({});
									setTypeErrors({});
								}
							}}
						>
							Back
						</Button>
					)}
					<Button
						size="md"
						onClick={() => void handlePrimaryAction()}
						loading={isLast && submitPending}
					>
						{isLast ? "Save" : "Next"}
					</Button>
				</div>
			</div>
		</CardMain>
	);
};

export default CreateFieldConfiguration;
