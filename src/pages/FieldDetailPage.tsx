import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { buildFieldConfigurationCreateBody, getFieldById } from "../api/services/fields";
import type { FieldConfigurationApiDocument } from "../api/services/fields";
import { useUpdateFieldMutation } from "../api/hooks/fields";
import { queryKeys } from "../api/queryKeys";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { formatUsDateTime } from "../lib/formatDateTime";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { DetailPageSkeleton } from "../components/skeletons";
import { Title } from "../components/base/Title";
import { Typography } from "../components/base/Typography";
import { Button } from "../components/base/Button";
import {
	DATA_TYPES,
	type DataType,
	DetailsStep,
	TypeStep,
	emptyDefaultForDataType,
	normalizeChoiceOptions,
	parseDefaultValueFromApi,
	validateDetailsStep,
	validateTypeStep,
	type DetailsStepErrors,
	type TypeStepErrors,
	FieldDetailsSectionReadOnly,
	FieldTypesSectionReadOnly,
} from "./fieldConfiguration/FieldFormShared";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";

function formatDefaultValueDisplay(dataType: string, raw: unknown): string {
	if (raw === null || raw === undefined || raw === "") return "—";
	if (dataType === "Boolean") return raw ? "True" : "False";
	if (dataType === "Date" || dataType === "DateTime") {
		const d = dayjs(String(raw));
		return d.isValid() ? formatUsDateTime(d.toISOString()) : "—";
	}
	if (typeof raw === "number") return String(raw);
	const s = String(raw);
	return s.trim() ? s : "—";
}

function applyDocToForm(doc: FieldConfigurationApiDocument, setters: {
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
}) {
	const details = doc.details;
	const type = doc.type;
	const nextDataType = (DATA_TYPES.includes(type.dataType as DataType)
		? type.dataType
		: "String") as DataType;

	setters.setName(details?.name ?? "");
	setters.setGroup(details?.group ?? "");
	setters.setGroupTechName(details?.groupTechnicalName ?? "");
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

export const FieldDetailPage = () => {
	const navigate = useNavigate();
	const { id: fieldId } = useParams<{ id: string }>();
	const [isEditing, setIsEditing] = useState(false);

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
		enabled: Boolean(fieldId),
	});
	const { refetch: refetchField } = fieldQuery;

	const updateFieldMutation = useUpdateFieldMutation();

	const hydrateFromDoc = useCallback((doc: FieldConfigurationApiDocument) => {
		applyDocToForm(doc, {
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
		});
		setDetailsErrors({});
		setTypeErrors({});
	}, []);

	useEffect(() => {
		if (!fieldQuery.data) return;
		if (isEditing) return;
		hydrateFromDoc(fieldQuery.data);
	}, [fieldQuery.data, isEditing, hydrateFromDoc]);

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

	const doc = fieldQuery.data;

	const readOnlyDefaultDisplay = doc
		? formatDefaultValueDisplay(String(doc.type?.dataType ?? ""), doc.type?.defaultValue)
		: "—";

	const pageTitle = isEditing ? name.trim() || "Edit field" : doc?.details?.name?.trim() || "Field";

	const navbarBreadcrumb = useMemo(
		() => [
			crumb("Configure", "/configure"),
			crumb("Fields", "/configure/fields"),
			crumb(pageTitle),
		],
		[pageTitle]
	);
	usePageBreadcrumb(navbarBreadcrumb);

	const handleStartEdit = useCallback(() => {
		if (!fieldQuery.data) return;
		hydrateFromDoc(fieldQuery.data);
		setIsEditing(true);
	}, [fieldQuery.data, hydrateFromDoc]);

	const handleCancelEdit = useCallback(() => {
		if (fieldQuery.data) hydrateFromDoc(fieldQuery.data);
		setIsEditing(false);
	}, [fieldQuery.data, hydrateFromDoc]);

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
			setIsEditing(false);
			void refetchField();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not update field configuration."));
		}
	}, [
		refetchField,
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
		required,
		tags,
		tooltip,
		updateFieldMutation,
		visible,
	]);

	if (fieldQuery.isPending) {
		return <DetailPageSkeleton />;
	}

	if (fieldQuery.isError || !doc) {
		return (
			<CardMain className="flex h-full flex-col items-center justify-center gap-3">
				<div className="text-sm text-error-500">
					{formatUserFacingError(fieldQuery.error, "Could not load field configuration.")}
				</div>
				<Button type="button" size="md" appearance="outlined" status="secondary-neutral" onClick={() => navigate("/configure/fields")}>
					Back to fields
				</Button>
			</CardMain>
		);
	}

	const details = doc.details;
	const type = doc.type;

	return (
		<CardMain className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<Title className="mb-0">{pageTitle}</Title>
				<div className="flex shrink-0 items-center gap-2">
					{isEditing ? (
						<>
							<Button
								type="button"
								size="md"
								appearance="outlined"
								status="secondary-neutral"
								onClick={handleCancelEdit}
								disabled={updateFieldMutation.isPending}
							>
								Cancel
							</Button>
							<Button type="button" size="md" onClick={() => void handleSave()} loading={updateFieldMutation.isPending}>
								Save
							</Button>
						</>
					) : (
						<Button type="button" size="md" onClick={handleStartEdit}>
							Edit
						</Button>
					)}
				</div>
			</div>

			{isEditing ? (
				<div className="flex flex-col gap-6">
					<Card className="flex flex-col gap-3">
						<Typography size="small" variant="semibold" appearance="custom" className="text-neutral-600 dark:text-neutral-300">
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
					</Card>
					<Card className="flex flex-col gap-3">
						<Typography size="small" variant="semibold" appearance="custom" className="text-neutral-600 dark:text-neutral-300">
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
					</Card>
				</div>
			) : (
				<div className="flex flex-col gap-6">
					<Card className="flex flex-col gap-4">
						<Typography size="small" variant="semibold" appearance="custom" className="text-neutral-600 dark:text-neutral-300">
							Details
						</Typography>
						<FieldDetailsSectionReadOnly
							name={details?.name ?? ""}
							group={details?.group ?? ""}
							groupTechName={details?.groupTechnicalName ?? ""}
							context={details?.context ?? ""}
							tags={Array.isArray(details?.tags) ? details.tags : []}
							tooltip={details?.tooltip ?? ""}
							visible={details?.visible !== false}
							required={Boolean(details?.required)}
							disabled={Boolean(details?.disabled)}
							locked={Boolean(details?.locked)}
						/>
					</Card>
					<Card className="flex flex-col gap-4">
						<Typography size="small" variant="semibold" appearance="custom" className="text-neutral-600 dark:text-neutral-300">
							Types
						</Typography>
						<FieldTypesSectionReadOnly
							fieldType={type?.fieldType ?? ""}
							dataType={type?.dataType ?? ""}
							choiceOptions={Array.isArray(type?.choiceOptions) ? type.choiceOptions : []}
							defaultValueDisplay={readOnlyDefaultDisplay}
						/>
					</Card>
				</div>
			)}
		</CardMain>
	);
};
