import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
	ApiError,
	type AgreementConfigApi,
	useAgreementConfigQuery,
	useConfigureAgreementConfigMutation,
	useDeleteAgreementConfigMutation,
} from "../api";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Button } from "../components/base/Button";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { CardMain } from "../components/base/CardMain";
import { AgreementConfigurationPageSkeleton } from "../components/skeletons";
import { Modal } from "../components/base/Modal";
import { Stepper, type StepperStep } from "../components/base/Stepper";
import { Typography } from "../components/base/Typography";
import { FormInput } from "../components/form-input/FormInput";
import { AddFieldsModal } from "./agreementConfiguration/AddFieldsModal";
import { buildAgreementConfigFieldContextLabel } from "../lib/fieldContext";
import {
	applyLayoutSectionsToConfigureState,
	orderDisplaySections,
} from "./agreementConfiguration/agreementLayoutDnD";
import {
	AgreementStepLayoutPanel,
	type DisplaySectionRow,
	mergeSectionFieldIds,
} from "./agreementConfiguration/AgreementStepLayoutPanel";
import {
	buildConfigureAgreementPayload,
	type ConfigureDraftSection,
	type ConfigureFieldOverrides,
} from "./agreementConfiguration/buildConfigureAgreementPayload";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";

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

type DraftSection = ConfigureDraftSection;

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
	const [fieldOverrides, setFieldOverrides] = useState<ConfigureFieldOverrides>({
		addedBySectionKey: {},
		removedFieldIdBySectionKey: {},
		sectionNameBySectionKey: {},
	});
	const [addFieldModalOpen, setAddFieldModalOpen] = useState(false);
	const [addFieldTargetSectionKey, setAddFieldTargetSectionKey] = useState<string | null>(null);
	const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

	const config = configQuery.data;

	const navbarBreadcrumb = useMemo(() => {
		const base = [
			crumb("Configure", "/configure"),
			crumb("Agreements", "/configure/agreements"),
		];
		if (!config) return [...base, crumb("Create")];
		return [...base, crumb(config.displayId ?? config._id)];
	}, [config]);
	usePageBreadcrumb(navbarBreadcrumb);

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

	const displaySections = useMemo(() => {
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

	const orderedDisplaySections = useMemo(
		() =>
			activeWizardStep
				? orderDisplaySections(displaySections, activeWizardStep._id, fieldOverrides)
				: displaySections,
		[activeWizardStep, displaySections, fieldOverrides]
	);

	const panelSections = useMemo(
		() =>
			orderedDisplaySections
				.filter((s) => !(fieldOverrides.deletedSectionKeys ?? []).includes(s.key))
				.map((s) => ({
					...s,
					name: fieldOverrides.sectionNameBySectionKey?.[s.key] ?? s.name,
					fields: mergeSectionFieldIds(s, fieldOverrides),
				})),
		[orderedDisplaySections, fieldOverrides]
	);

	const handleLayoutSectionsChange = useCallback(
		(sections: DisplaySectionRow[]) => {
			if (!activeWizardStep) return;
			applyLayoutSectionsToConfigureState(
				activeWizardStep._id,
				displaySections,
				sections,
				setDraftSectionsByStepId,
				setFieldOverrides
			);
		},
		[activeWizardStep, displaySections]
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
			...p,
			addedBySectionKey: {
				...p.addedBySectionKey,
				[sectionKey]: [...new Set([...(p.addedBySectionKey[sectionKey] ?? []), ...ids])],
			},
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
			return {
				...p,
				addedBySectionKey: added,
				removedFieldIdBySectionKey: removed,
			};
		});
	}, []);

	const handleRenameSection = useCallback((sectionKey: string, name: string) => {
		setFieldOverrides((p) => ({
			...p,
			sectionNameBySectionKey: {
				...(p.sectionNameBySectionKey ?? {}),
				[sectionKey]: name.trim(),
			},
		}));
	}, []);

	const handleDeleteSection = useCallback((sectionKey: string) => {
		setFieldOverrides((p) => ({
			...p,
			deletedSectionKeys: [...new Set([...(p.deletedSectionKeys ?? []), sectionKey])],
		}));
		if (sectionKey.startsWith("draft-") && activeWizardStep) {
			const draftId = sectionKey.slice("draft-".length);
			setDraftSectionsByStepId((p) => ({
				...p,
				[activeWizardStep._id]: (p[activeWizardStep._id] ?? []).filter((d) => d.id !== draftId),
			}));
		}
	}, [activeWizardStep]);

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
			void navigate("/configure/agreements");
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not save agreement configuration."));
		}
	}, [config, id, draftSectionsByStepId, fieldOverrides, configureMutation, navigate]);

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

	if (configQuery.isPending) {
		return <AgreementConfigurationPageSkeleton />;
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
					<AgreementStepLayoutPanel
						displaySections={panelSections}
						onSectionsChange={handleLayoutSectionsChange}
						onOpenAddSection={handleOpenAddSection}
						onOpenAddField={handleOpenAddField}
						onRemoveFieldFromSection={handleRemoveFieldFromSection}
						onRenameSection={handleRenameSection}
						onDeleteSection={handleDeleteSection}
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
			agreementConfigId={id}
			defaultFieldContext={
				config ? buildAgreementConfigFieldContextLabel(config) ?? undefined : undefined
			}
			onClose={handleCloseAddFieldModal}
			onConfirm={handleConfirmAddFields}
		/>
		</>
	);
};

export default CreateAgreementConfiguration;
