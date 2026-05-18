import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { toast } from "react-toastify";
import type { Dayjs } from "dayjs";
import { buildFieldConfigurationCreateBody } from "../../api/services/fields";
import { useCreateFieldMutation } from "../../api/hooks/fields";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { Typography } from "../../components/base/Typography";
import {
	DetailsStep,
	TypeStep,
	emptyDefaultForDataType,
	normalizeChoiceOptions,
	validateDetailsStep,
	validateTypeStep,
	type DataType,
	type DetailsStepErrors,
	type TypeStepErrors,
} from "./FieldFormShared";

export type CreateFieldFormHandle = {
	submit: () => Promise<string | null>;
	reset: () => void;
	isPending: boolean;
};

function createDefaultFormState() {
	return {
		name: "",
		group: "",
		groupTechName: "",
		context: "Global",
		tags: [] as string[],
		tooltip: "",
		visible: true,
		required: false,
		disabled: false,
		locked: false,
		fieldType: "Generic",
		dataType: "String" as DataType,
		choiceOptions: [] as string[],
		choiceDraft: "",
		defaultValue: emptyDefaultForDataType("String") as string | number | boolean | Dayjs | null,
	};
}

export const CreateFieldForm = forwardRef<CreateFieldFormHandle>(function CreateFieldForm(_, ref) {
	const defaults = createDefaultFormState();
	const [name, setName] = useState(defaults.name);
	const [group, setGroup] = useState(defaults.group);
	const [groupTechName, setGroupTechName] = useState(defaults.groupTechName);
	const [context, setContext] = useState(defaults.context);
	const [tags, setTags] = useState<string[]>(defaults.tags);
	const [tooltip, setTooltip] = useState(defaults.tooltip);
	const [visible, setVisible] = useState(defaults.visible);
	const [required, setRequired] = useState(defaults.required);
	const [disabled, setDisabled] = useState(defaults.disabled);
	const [locked, setLocked] = useState(defaults.locked);
	const [fieldType, setFieldType] = useState(defaults.fieldType);
	const [dataType, setDataType] = useState<DataType>(defaults.dataType);
	const [choiceOptions, setChoiceOptions] = useState<string[]>(defaults.choiceOptions);
	const [choiceDraft, setChoiceDraft] = useState(defaults.choiceDraft);
	const [defaultValue, setDefaultValue] = useState<string | number | boolean | Dayjs | null>(
		defaults.defaultValue
	);
	const [detailsErrors, setDetailsErrors] = useState<DetailsStepErrors>({});
	const [typeErrors, setTypeErrors] = useState<TypeStepErrors>({});

	const createFieldMutation = useCreateFieldMutation();

	const reset = useCallback(() => {
		const next = createDefaultFormState();
		setName(next.name);
		setGroup(next.group);
		setGroupTechName(next.groupTechName);
		setContext(next.context);
		setTags(next.tags);
		setTooltip(next.tooltip);
		setVisible(next.visible);
		setRequired(next.required);
		setDisabled(next.disabled);
		setLocked(next.locked);
		setFieldType(next.fieldType);
		setDataType(next.dataType);
		setChoiceOptions(next.choiceOptions);
		setChoiceDraft(next.choiceDraft);
		setDefaultValue(next.defaultValue);
		setDetailsErrors({});
		setTypeErrors({});
	}, []);

	useEffect(() => {
		if (dataType !== "Choice") return;
		setDefaultValue((prev) => {
			if (typeof prev !== "string" || !prev) return prev;
			return choiceOptions.includes(prev) ? prev : "";
		});
	}, [dataType, choiceOptions]);

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

	const submit = useCallback(async (): Promise<string | null> => {
		const de = validateDetailsStep(name, group);
		const te = validateTypeStep(fieldType, dataType, choiceOptions);
		if (Object.keys(de).length > 0 || Object.keys(te).length > 0) {
			setDetailsErrors(de);
			setTypeErrors(te);
			toast.error("Please fill out all mandatory fields.");
			return null;
		}
		setDetailsErrors({});
		setTypeErrors({});
		try {
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
			const doc = await createFieldMutation.mutateAsync(payload);
			toast.success("Field created.");
			return doc._id;
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not create field."));
			return null;
		}
	}, [
		choiceOptions,
		context,
		createFieldMutation,
		dataType,
		defaultValue,
		disabled,
		fieldType,
		group,
		groupTechName,
		locked,
		name,
		required,
		tags,
		tooltip,
		visible,
	]);

	useImperativeHandle(
		ref,
		() => ({
			submit,
			reset,
			isPending: createFieldMutation.isPending,
		}),
		[submit, reset, createFieldMutation.isPending]
	);

	return (
		<div className="max-h-[min(70vh,640px)] overflow-y-auto pr-1">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-3">
					<Typography
						size="small"
						variant="semibold"
						appearance="custom"
						className="text-neutral-600 dark:text-neutral-300"
					>
						Details
					</Typography>
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
				</div>
				<div className="flex flex-col gap-3">
					<Typography
						size="small"
						variant="semibold"
						appearance="custom"
						className="text-neutral-600 dark:text-neutral-300"
					>
						Types
					</Typography>
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
				</div>
			</div>
		</div>
	);
});
