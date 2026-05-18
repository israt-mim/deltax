import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import type { Dayjs } from "dayjs";
import { buildFieldConfigurationCreateBody, getFieldById } from "../../api/services/fields";
import { useUpdateFieldMutation } from "../../api/hooks/fields";
import { queryKeys } from "../../api/queryKeys";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { Modal } from "../../components/base/Modal";
import { Button } from "../../components/base/Button";
import { Typography } from "../../components/base/Typography";
import { SkeletonInline } from "../../components/skeletons";
import {
	applyFieldDocToForm,
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

export interface EditFieldModalProps {
	open: boolean;
	fieldId: string | null;
	onClose: () => void;
	onSaved?: () => void;
}

export function EditFieldModal({ open, fieldId, onClose, onSaved }: EditFieldModalProps) {
	const [name, setName] = useState("");
	const [group, setGroup] = useState("");
	const [groupTechName, setGroupTechName] = useState("");
	const [context, setContext] = useState("");
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

	const fieldQuery = useQuery({
		queryKey: [...queryKeys.fields.all, "detail", fieldId] as const,
		queryFn: () => getFieldById(fieldId as string),
		enabled: open && Boolean(fieldId),
	});

	const updateFieldMutation = useUpdateFieldMutation();

	const formSetters = {
		setName,
		setGroup,
		setGroupTechName,
		setContext,
		setTags,
		setTooltip,
		setVisible,
		setRequired,
		setDisabled,
		setLocked,
		setFieldType,
		setDataType,
		setChoiceOptions,
		setChoiceDraft,
		setDefaultValue,
	};

	const hydrateFromDoc = useCallback(() => {
		if (!fieldQuery.data) return;
		applyFieldDocToForm(fieldQuery.data, formSetters);
		setDetailsErrors({});
		setTypeErrors({});
	}, [fieldQuery.data]);

	useEffect(() => {
		if (!open || !fieldQuery.data) return;
		hydrateFromDoc();
	}, [open, fieldQuery.data, hydrateFromDoc]);

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

	const handleCancel = useCallback(() => {
		hydrateFromDoc();
		onClose();
	}, [hydrateFromDoc, onClose]);

	const handleSave = useCallback(async () => {
		const de = validateDetailsStep(name, group);
		const te = validateTypeStep(fieldType, dataType, choiceOptions);
		if (Object.keys(de).length > 0 || Object.keys(te).length > 0) {
			setDetailsErrors(de);
			setTypeErrors(te);
			toast.error("Please fill out all mandatory fields.");
			return;
		}
		setDetailsErrors({});
		setTypeErrors({});
		if (!fieldId) return;
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
			await updateFieldMutation.mutateAsync({ id: fieldId, body: payload });
			toast.success("Field configuration updated.");
			onSaved?.();
			onClose();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not update field configuration."));
		}
	}, [
		choiceOptions,
		context,
		dataType,
		defaultValue,
		disabled,
		fieldId,
		fieldType,
		group,
		groupTechName,
		locked,
		name,
		onClose,
		onSaved,
		required,
		tags,
		tooltip,
		updateFieldMutation,
		visible,
	]);

	const titleId = "edit-field-modal-title";
	const modalTitle = name.trim() || fieldQuery.data?.details?.name?.trim() || "Edit field";

	return (
		<Modal
			open={open}
			onCancel={handleCancel}
			width={720}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					{modalTitle}
				</h2>
			}
			footer={
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						onClick={handleCancel}
						disabled={updateFieldMutation.isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="md"
						onClick={() => void handleSave()}
						loading={updateFieldMutation.isPending}
						disabled={fieldQuery.isPending || fieldQuery.isError}
					>
						Save
					</Button>
				</div>
			}
			aria-labelledby={titleId}
		>
			{fieldQuery.isPending ? (
				<div className="flex flex-col gap-4 py-2">
					<SkeletonInline className="h-4 w-32" />
					<SkeletonInline className="h-10 w-full" />
					<SkeletonInline className="h-10 w-full" />
					<SkeletonInline className="h-10 w-full" />
				</div>
			) : fieldQuery.isError ? (
				<p className="text-sm text-error-600 dark:text-error-400">
					{formatUserFacingError(fieldQuery.error, "Could not load field configuration.")}
				</p>
			) : (
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
			)}
		</Modal>
	);
}
