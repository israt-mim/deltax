import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DragIndicatorOutlinedIcon from "@mui/icons-material/DragIndicatorOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import {
	ApiError,
	getFieldById,
	type AgreementConfigApi,
	type FieldConfigurationApiDocument,
	useAgreementConfigQuery,
	useConfigureAgreementConfigMutation,
	useDeleteAgreementConfigMutation,
} from "../api";
import { queryKeys } from "../api/queryKeys";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Button } from "../components/base/Button";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { Modal } from "../components/base/Modal";
import { Stepper, type StepperStep } from "../components/base/Stepper";
import { Typography } from "../components/base/Typography";
import { FormInput } from "../components/form-input/FormInput";
import { AddFieldsModal } from "./agreementConfiguration/AddFieldsModal";
import { buildConfigureAgreementPayload } from "./agreementConfiguration/buildConfigureAgreementPayload";

function statusBadgeClass(isActive: boolean | undefined) {
	if (isActive) {
		return "rounded-full px-2 py-0.5 text-xs font-medium bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300";
	}
	return "rounded-full px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200";
}

const WIZARD_HIDDEN_STEP_NAMES = new Set(["authoring", "clauses"]);

function isWizardVisibleStep(step: { name: string }): boolean {
	return !WIZARD_HIDDEN_STEP_NAMES.has(step.name.trim().toLowerCase());
}

function buildBreadcrumb(config: AgreementConfigApi): string {
	const parts = [
		config.agreement_category?.name,
		config.agreement_domain?.name,
		config.agreement_type?.name,
		config.agreement_subtype?.name,
	].filter(Boolean) as string[];
	return parts.join(" → ");
}

function fieldCardLabel(fieldId: string, doc: FieldConfigurationApiDocument | undefined): string {
	if (!doc?.details) return `Field ${fieldId.slice(0, 8)}…`;
	const name = doc.details.name?.trim() || "—";
	const tech = doc.details.groupTechnicalName?.trim() || fieldId;
	return `${name} (${tech})`;
}

export type DraftSection = {
	id: string;
	name: string;
	fields: string[];
};

type DisplaySectionRow = { key: string; name: string; fields: string[] };

type FieldLayoutOverrides = {
	addedBySectionKey: Record<string, string[]>;
	removedFieldIdBySectionKey: Record<string, string[]>;
};

function mergeSectionFieldIds(section: DisplaySectionRow, overrides: FieldLayoutOverrides): string[] {
	const removed = new Set(overrides.removedFieldIdBySectionKey[section.key] ?? []);
	const base = (section.fields ?? []).filter((id) => !removed.has(id));
	const added = overrides.addedBySectionKey[section.key] ?? [];
	return [...new Set([...base, ...added])];
}

function FieldTile({
	fieldId,
	doc,
	loading,
	onEdit,
	onRemove,
}: {
	fieldId: string;
	doc: FieldConfigurationApiDocument | undefined;
	loading: boolean;
	onEdit?: () => void;
	onRemove?: () => void;
}) {
	return (
		<Card className="group flex items-start gap-2 border border-neutral-200 bg-white px-3 py-3 shadow-sm dark:border-black-500 dark:bg-black-700">
			<DragIndicatorOutlinedIcon sx={{ fontSize: 18 }} className="mt-0.5 shrink-0 text-neutral-400" />
			<span className="min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
				{loading ? "Loading…" : fieldCardLabel(fieldId, doc)}
			</span>
			{(onEdit || onRemove) && (
				<div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
					{onEdit && (
						<button
							type="button"
							aria-label="Edit field"
							className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-black-600 dark:hover:text-neutral-100"
							onClick={onEdit}
						>
							<EditOutlinedIcon sx={{ fontSize: 18 }} />
						</button>
					)}
					{onRemove && (
						<button
							type="button"
							aria-label="Remove field"
							className="rounded p-1 text-neutral-500 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950/40 dark:hover:text-error-400"
							onClick={onRemove}
						>
							<CloseOutlinedIcon sx={{ fontSize: 18 }} />
						</button>
					)}
				</div>
			)}
		</Card>
	);
}

function StepLayoutPanel({
	displaySections,
	onOpenAddSection,
	onOpenAddField,
	onRemoveFieldFromSection,
}: {
	displaySections: DisplaySectionRow[];
	onOpenAddSection: () => void;
	onOpenAddField: (sectionKey: string) => void;
	onRemoveFieldFromSection: (sectionKey: string, fieldId: string) => void;
}) {
	const fieldIds = useMemo(() => {
		const ids = displaySections.flatMap((s) => s.fields ?? []);
		return [...new Set(ids.filter(Boolean))];
	}, [displaySections]);

	const fieldQueries = useQueries({
		queries: fieldIds.map((fid) => ({
			queryKey: [...queryKeys.fields.all, "detail", fid] as const,
			queryFn: () => getFieldById(fid),
			enabled: Boolean(fid),
			staleTime: 60_000,
		})),
	});

	if (displaySections.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 py-16 dark:border-black-500 dark:bg-black-800/40">
				<Typography size="medium" variant="semibold" className="text-neutral-700 dark:text-neutral-200">
					No layout for this step yet
				</Typography>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-200 dark:hover:bg-primary-900/60"
					onClick={onOpenAddSection}
				>
					<AddOutlinedIcon sx={{ fontSize: 18 }} />
					New Section
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{displaySections.map((section) => (
				<div
					key={section.key}
					className="flex flex-col gap-3 overflow-hidden rounded-lg border border-neutral-200 dark:border-black-500"
				>
					<div className="flex items-center justify-between gap-2 bg-neutral-100 px-3 py-2.5 dark:bg-black-600">
						<div className="flex min-w-0 items-center gap-2">
							<DragIndicatorOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 text-neutral-400" />
							<span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
								{section.name}
							</span>
						</div>
						<ExpandMoreOutlinedIcon sx={{ fontSize: 20 }} className="shrink-0 text-neutral-400" />
					</div>
					<div className="flex flex-col gap-3 px-3 pb-3">
						<div className="flex flex-wrap gap-2">
							{(section.fields ?? []).map((fid) => {
								const idx = fieldIds.indexOf(fid);
								const q = idx >= 0 ? fieldQueries[idx] : undefined;
								return (
									<FieldTile
										key={`${section.key}-${fid}`}
										fieldId={fid}
										doc={q?.data}
										loading={Boolean(q?.isPending || q?.isFetching)}
										onEdit={() => toast.info("Field editing opens from Fields configuration.")}
										onRemove={() => onRemoveFieldFromSection(section.key, fid)}
									/>
								);
							})}
						</div>
						<button
							type="button"
							className="self-start text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
							onClick={() => onOpenAddField(section.key)}
						>
							+ Add Field
						</button>
					</div>
				</div>
			))}
			<button
				type="button"
				className="mx-auto inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-200 dark:hover:bg-primary-900/60"
				onClick={onOpenAddSection}
			>
				<AddOutlinedIcon sx={{ fontSize: 18 }} />
				New Section
			</button>
		</div>
	);
}

const CreateAgreementConfiguration = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const configQuery = useAgreementConfigQuery({ id });
	const configureMutation = useConfigureAgreementConfigMutation();
	const deleteAgreementMutation = useDeleteAgreementConfigMutation();
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const [draftSectionsByStepId, setDraftSectionsByStepId] = useState<Record<string, DraftSection[]>>({});
	const [addSectionOpen, setAddSectionOpen] = useState(false);
	const [newSectionName, setNewSectionName] = useState("");
	const [newSectionError, setNewSectionError] = useState<string | undefined>();
	const [fieldOverrides, setFieldOverrides] = useState<FieldLayoutOverrides>({
		addedBySectionKey: {},
		removedFieldIdBySectionKey: {},
	});
	const [addFieldModalOpen, setAddFieldModalOpen] = useState(false);
	const [addFieldTargetSectionKey, setAddFieldTargetSectionKey] = useState<string | null>(null);
	const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

	const config = configQuery.data;

	const visibleWizardSteps = useMemo(() => {
		if (!config?.steps?.length) return [];
		return config.steps.filter(isWizardVisibleStep);
	}, [config?.steps]);

	useEffect(() => {
		if (!visibleWizardSteps.length) return;
		setActiveStepIndex((i) => Math.min(i, visibleWizardSteps.length - 1));
	}, [visibleWizardSteps]);

	useEffect(() => {
		if (!configQuery.isError || !configQuery.error) return;
		const err = configQuery.error;
		const message =
			err instanceof ApiError && err.status === 404
				? "This agreement configuration could not be found."
				: formatUserFacingError(err, "Could not load agreement configuration.");
		toast.error(message, { toastId: `agreement-config-detail-${id ?? "unknown"}` });
	}, [configQuery.isError, configQuery.error, id]);

	const stepperSteps: StepperStep[] = useMemo(
		() => visibleWizardSteps.map((s) => ({ key: s._id, label: s.name })),
		[visibleWizardSteps]
	);

	const activeWizardStep = visibleWizardSteps[activeStepIndex];
	const layoutForActiveStep = useMemo(() => {
		if (!activeWizardStep || !config?.configuredSteps?.length) return undefined;
		return config.configuredSteps.find((c) => c.id === activeWizardStep._id);
	}, [config?.configuredSteps, activeWizardStep]);

	const displaySections: DisplaySectionRow[] = useMemo(() => {
		if (!activeWizardStep) return [];
		const stepId = activeWizardStep._id;
		const apiSections = layoutForActiveStep?.sections ?? [];
		const apiRows = apiSections.map((s, i) => ({
			key: `api-${stepId}-${i}`,
			name: s.name,
			fields: [...(s.fields ?? [])],
		}));
		const drafts = draftSectionsByStepId[stepId] ?? [];
		const draftRows = drafts.map((d) => ({
			key: `draft-${d.id}`,
			name: d.name,
			fields: [...d.fields],
		}));
		return [...apiRows, ...draftRows];
	}, [activeWizardStep, layoutForActiveStep, draftSectionsByStepId]);

	const panelSections: DisplaySectionRow[] = useMemo(
		() =>
			displaySections.map((s) => ({
				...s,
				fields: mergeSectionFieldIds(s, fieldOverrides),
			})),
		[displaySections, fieldOverrides]
	);

	const excludeFieldIdsForAddModal = useMemo(() => {
		if (!addFieldTargetSectionKey) return [];
		const sec = panelSections.find((s) => s.key === addFieldTargetSectionKey);
		return sec?.fields ?? [];
	}, [addFieldTargetSectionKey, panelSections]);

	const handleOpenAddSection = useCallback(() => {
		setNewSectionName("");
		setNewSectionError(undefined);
		setAddSectionOpen(true);
	}, []);

	const handleCloseAddSection = useCallback(() => {
		setAddSectionOpen(false);
		setNewSectionName("");
		setNewSectionError(undefined);
	}, []);

	const handleSubmitAddSection = useCallback(() => {
		if (!activeWizardStep) {
			handleCloseAddSection();
			return;
		}
		const trimmed = newSectionName.trim();
		if (!trimmed) {
			setNewSectionError("Section name is required");
			return;
		}
		const stepId = activeWizardStep._id;
		const newId = crypto.randomUUID();
		setDraftSectionsByStepId((prev) => ({
			...prev,
			[stepId]: [...(prev[stepId] ?? []), { id: newId, name: trimmed, fields: [] }],
		}));
		handleCloseAddSection();
	}, [activeWizardStep, newSectionName, handleCloseAddSection]);

	const handleOpenAddField = useCallback((sectionKey: string) => {
		setAddFieldTargetSectionKey(sectionKey);
		setAddFieldModalOpen(true);
	}, []);

	const handleCloseAddFieldModal = useCallback(() => {
		setAddFieldModalOpen(false);
		setAddFieldTargetSectionKey(null);
	}, []);

	const handleConfirmAddFields = useCallback((ids: string[], sectionKey: string) => {
		setFieldOverrides((p) => ({
			addedBySectionKey: {
				...p.addedBySectionKey,
				[sectionKey]: [...new Set([...(p.addedBySectionKey[sectionKey] ?? []), ...ids])],
			},
			removedFieldIdBySectionKey: p.removedFieldIdBySectionKey,
		}));
	}, []);

	const handleRemoveFieldFromSection = useCallback((sectionKey: string, fieldId: string) => {
		setFieldOverrides((p) => {
			const added = { ...p.addedBySectionKey };
			const removed = { ...p.removedFieldIdBySectionKey };
			const addList = added[sectionKey] ?? [];
			if (addList.includes(fieldId)) {
				added[sectionKey] = addList.filter((x) => x !== fieldId);
			} else {
				removed[sectionKey] = [...new Set([...(removed[sectionKey] ?? []), fieldId])];
			}
			return { addedBySectionKey: added, removedFieldIdBySectionKey: removed };
		});
	}, []);

	const handleCompleteConfigure = useCallback(async () => {
		if (!config || !id?.trim()) return;
		if (config.isCompleted) {
			toast.info("This agreement configuration is already completed.");
			return;
		}
		try {
			const body = buildConfigureAgreementPayload(config, draftSectionsByStepId, fieldOverrides);
			await configureMutation.mutateAsync({ id: id.trim(), body });
			toast.success("Agreement configuration saved.");
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not save agreement configuration."));
		}
	}, [config, id, draftSectionsByStepId, fieldOverrides, configureMutation]);

	const handleConfirmDiscard = useCallback(async () => {
		const configId = id?.trim();
		if (!configId) return;
		try {
			await deleteAgreementMutation.mutateAsync(configId);
			setDiscardConfirmOpen(false);
			void navigate("/configure/agreements");
			toast.success("Agreement configuration discarded.");
		} catch (e) {
			if (e instanceof ApiError && e.status === 404) {
				setDiscardConfirmOpen(false);
				void navigate("/configure/agreements");
				return;
			}
			toast.error(formatUserFacingError(e, "Could not discard agreement configuration."));
		}
	}, [id, deleteAgreementMutation, navigate]);

	useEffect(() => {
		setAddSectionOpen(false);
	}, [activeStepIndex]);

	useEffect(() => {
		setAddFieldModalOpen(false);
		setAddFieldTargetSectionKey(null);
	}, [activeStepIndex]);

	if (!id?.trim()) {
		return (
			<CardMain className="flex flex-col gap-4">
				<Typography size="small" className="text-neutral-600 dark:text-neutral-400">
					Missing configuration id.
				</Typography>
			</CardMain>
		);
	}

	if (configQuery.isLoading) {
		return (
			<CardMain className="flex flex-col gap-4">
				<p className="text-sm text-neutral-500 dark:text-neutral-400">Loading configuration…</p>
			</CardMain>
		);
	}

	if (!config) {
		return (
			<CardMain className="flex flex-col gap-4">
				<p className="text-sm text-neutral-500 dark:text-neutral-400">No configuration data.</p>
			</CardMain>
		);
	}

	const headerId = config.displayId ?? config._id;
	const breadcrumb = buildBreadcrumb(config);
	const isActive = config.isActive === true;
	const isLastWizardStep =
		stepperSteps.length > 0 && activeStepIndex === stepperSteps.length - 1;

	const addSectionTitleId = "add-agreement-section-modal-title";

	return (
		<>
		<CardMain className="flex min-h-0 flex-1 flex-col gap-0">
			<div className="flex flex-col gap-4 pb-4">
				<div className="flex flex-wrap items-center gap-2 gap-y-1">
					<DescriptionOutlinedIcon sx={{ fontSize: 22 }} className="text-neutral-500 dark:text-neutral-400" />
					<span className="text-lg font-semibold text-neutral-900 dark:text-white">{headerId}</span>
					<span className={statusBadgeClass(isActive)}>{isActive ? "Active" : "Draft"}</span>
				</div>
				<Typography size="small" variant="regular" className="text-neutral-600 dark:text-neutral-400">
					{breadcrumb}
				</Typography>
				{stepperSteps.length > 0 && (
					<Stepper
						steps={stepperSteps}
						activeStep={activeStepIndex}
						onStepClick={setActiveStepIndex}
						className="w-full pt-1"
					/>
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-auto py-4">
				{stepperSteps.length > 0 && activeWizardStep ? (
					<StepLayoutPanel
						displaySections={panelSections}
						onOpenAddSection={handleOpenAddSection}
						onOpenAddField={handleOpenAddField}
						onRemoveFieldFromSection={handleRemoveFieldFromSection}
					/>
				) : (
					<p className="text-sm text-neutral-500 dark:text-neutral-400">No steps on this configuration.</p>
				)}
			</div>

			<div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-black-600">
				<button
					type="button"
					className="text-sm font-medium text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
					onClick={() => setDiscardConfirmOpen(true)}
				>
					Discard
				</button>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						disabled={activeStepIndex === 0}
						onClick={() => setActiveStepIndex((s) => Math.max(0, s - 1))}
					>
						Previous
					</Button>
					<Button
						type="button"
						size="md"
						appearance="filled"
						status="primary"
						loading={isLastWizardStep && configureMutation.isPending}
						disabled={isLastWizardStep && config.isCompleted === true}
						onClick={() => {
							if (isLastWizardStep) {
								void handleCompleteConfigure();
								return;
							}
							setActiveStepIndex((s) => Math.min(stepperSteps.length - 1, s + 1));
						}}
					>
						{isLastWizardStep ? "Configure New Agreement" : "Next"}
					</Button>
				</div>
			</div>
		</CardMain>

		<ConfirmModal
			open={discardConfirmOpen}
			onClose={() => setDiscardConfirmOpen(false)}
			title="Confirm Exit"
			cancelLabel="Cancel"
			confirmLabel="Confirm"
			width={480}
			pending={deleteAgreementMutation.isPending}
			onConfirm={() => void handleConfirmDiscard()}
		>
			<p className="mb-0">Are you sure you want to cancel? Unsaved changes will be lost.</p>
		</ConfirmModal>

		<Modal
			open={addSectionOpen}
			onCancel={handleCloseAddSection}
			width={480}
			header={
				<h2 id={addSectionTitleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					Add Section
				</h2>
			}
			footer={
				<div className="flex justify-end">
					<Button
						type="submit"
						form="add-agreement-section-form"
						size="md"
						appearance="filled"
						status="primary"
					>
						Add Section
					</Button>
				</div>
			}
			aria-labelledby={addSectionTitleId}
		>
			<form
				id="add-agreement-section-form"
				className="flex flex-col gap-4"
				onSubmit={(e) => {
					e.preventDefault();
					handleSubmitAddSection();
				}}
			>
				<FormInput
					placeholder="Enter section name"
					value={newSectionName}
					onChange={(e) => {
						setNewSectionName(e.target.value);
						setNewSectionError(undefined);
					}}
					error={newSectionError}
				/>
			</form>
		</Modal>

		<AddFieldsModal
			open={addFieldModalOpen}
			sectionKey={addFieldTargetSectionKey}
			excludeFieldIds={excludeFieldIdsForAddModal}
			onClose={handleCloseAddFieldModal}
			onConfirm={handleConfirmAddFields}
		/>
		</>
	);
};

export default CreateAgreementConfiguration;
