import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
	ApiError,
	agreementStepDetailsOfQuery,
	agreementStepEditorHideWizardNav,
	buildAgreementFieldValuesPatchList,
	fieldValuesPatchOfParam,
	getAgreementStepDetails,
	getAgreementSteps,
	isAgreementFieldValuesStep,
	isAuthoringOrModificationAgreementCreationStep,
	isClausesWizardStepName,
	isLineItemsAgreementStep,
	isLineItemsWizardStepName,
	isMongoObjectIdString,
	useAgreementDashboardQuery,
	useDeleteAgreementMutation,
	usePatchAgreementFieldValuesMutation,
	usePatchAgreementLineItemMutation,
	usePostAgreementLineItemMutation,
	type AgreementDashboardData,
	type AgreementDocumentStep,
	type AgreementStepDetailsData,
} from "../api";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Button } from "../components/base/Button";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { PageLoader } from "../components/base/PageLoader";
import { Stepper, type StepperStep } from "../components/base/Stepper";
import { Typography } from "../components/base/Typography";
import { AgreementClausesStepPanel } from "./agreementConfiguration/AgreementClausesStepPanel";
import { AgreementLineItemEditorView } from "./agreementConfiguration/AgreementLineItemEditorView";
import { AgreementLineItemsStepPanel } from "./agreementConfiguration/AgreementLineItemsStepPanel";
import { AgreementStepDetailsForm } from "./agreementConfiguration/AgreementStepDetailsForm";
import {
	emptyLineItemValuesFromLayout,
	fieldValuesArrayFromRecord,
	valuesRecordFromLineItemPayload,
} from "./agreementConfiguration/agreementLineItemsUtils";
import {
	buildInitialFieldValues,
	validateRequiredAgreementFields,
} from "./agreementConfiguration/agreementStepDetailsValidation";

/** `/agreements/create/:id` — `id` is the Agreement document ObjectId. */
export default function CreateAgreementDetailsPage() {
	const { id: agreementIdParam } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const deleteAgreementMutation = useDeleteAgreementMutation();
	const patchFieldValuesMutation = usePatchAgreementFieldValuesMutation();
	const postLineItemMutation = usePostAgreementLineItemMutation();
	const patchLineItemMutation = usePatchAgreementLineItemMutation();

	const agreementId = agreementIdParam?.trim() ?? "";

	const dashboardQuery = useAgreementDashboardQuery({
		agreementId,
		enabled: Boolean(agreementId) && isMongoObjectIdString(agreementId),
	});
	const dashboard: AgreementDashboardData | undefined = dashboardQuery.data;

	const [steps, setSteps] = useState<AgreementDocumentStep[]>([]);
	const [stepsLoading, setStepsLoading] = useState(true);
	const [stepsError, setStepsError] = useState<string | null>(null);
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

	const [stepDetails, setStepDetails] = useState<AgreementStepDetailsData | null>(null);
	const [stepDetailsLoading, setStepDetailsLoading] = useState(false);
	const [stepDetailsError, setStepDetailsError] = useState<string | null>(null);
	const [fieldValuesByStepId, setFieldValuesByStepId] = useState<Record<string, Record<string, unknown>>>({});
	const [fieldErrorsById, setFieldErrorsById] = useState<Record<string, string>>({});
	/** `null` = Line Items list/table; `"new"` or line-item `_id` = editor GET modes. */
	const [lineItemQuery, setLineItemQuery] = useState<string | null>(null);
	const [stepDetailsNonce, setStepDetailsNonce] = useState(0);

	const refreshStepDetails = useCallback(() => {
		setStepDetailsNonce((n) => n + 1);
	}, []);

	useEffect(() => {
		setFieldValuesByStepId({});
		setLineItemQuery(null);
	}, [agreementId]);

	useEffect(() => {
		if (!agreementId || !isMongoObjectIdString(agreementId)) {
			setSteps([]);
			setStepsLoading(false);
			setStepsError(!agreementId ? "Missing agreement id." : "Invalid agreement id.");
			return;
		}

		let cancelled = false;
		setStepsLoading(true);
		setStepsError(null);

		void getAgreementSteps(agreementId)
			.then((res) => {
				if (cancelled) return;
				const raw = Array.isArray(res.steps) ? res.steps : [];
				setSteps(raw.filter((s) => !isAuthoringOrModificationAgreementCreationStep(s)));
				setStepsLoading(false);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setSteps([]);
				setStepsLoading(false);
				const message = formatUserFacingError(err, "Could not load agreement steps.");
				setStepsError(message);
				toast.error(message, { toastId: `agreement-steps-${agreementId}` });
			});

		return () => {
			cancelled = true;
		};
	}, [agreementId]);

	useEffect(() => {
		if (steps.length === 0) return;
		setActiveStepIndex((i) => Math.min(Math.max(0, i), steps.length - 1));
	}, [steps]);

	const currentStep = steps[activeStepIndex];
	const stepStorageKey = currentStep?.id ?? "";

	useEffect(() => {
		if (!currentStep || !isLineItemsWizardStepName(currentStep)) {
			setLineItemQuery(null);
		}
		setFieldErrorsById({});
	}, [currentStep?.id, currentStep?.name]);

	const hideLineItemsWizardNav = useMemo(() => {
		if (!currentStep || !isLineItemsWizardStepName(currentStep)) return false;
		const q = lineItemQuery?.trim();
		if (!q || q.toLowerCase() === "list") return false;
		if (agreementStepEditorHideWizardNav(stepDetails)) return true;
		if (q === "new" || isMongoObjectIdString(q)) return true;
		return false;
	}, [currentStep, lineItemQuery, stepDetails]);

	const currentFieldValues = useMemo(() => {
		if (!stepDetails?.sections?.length) return {};
		const defaults = buildInitialFieldValues(stepDetails);
		const stored = fieldValuesByStepId[stepStorageKey] ?? {};
		return { ...defaults, ...stored };
	}, [stepDetails, stepStorageKey, fieldValuesByStepId]);

	const handleFieldValueChange = useCallback(
		(fieldId: string, value: unknown) => {
			if (!stepStorageKey || !stepDetails?.sections?.length) return;
			const defaults = buildInitialFieldValues(stepDetails);
			setFieldValuesByStepId((prev) => {
				const cur = { ...defaults, ...(prev[stepStorageKey] ?? {}) };
				return { ...prev, [stepStorageKey]: { ...cur, [fieldId]: value } };
			});
			setFieldErrorsById((prev) => {
				if (!prev[fieldId]) return prev;
				const next = { ...prev };
				delete next[fieldId];
				return next;
			});
		},
		[stepStorageKey, stepDetails]
	);

	const canValidateCurrentStep = Boolean(stepDetails && !stepDetailsError && !stepDetailsLoading);

	const assertCurrentStepValid = useCallback((): boolean => {
		if (!canValidateCurrentStep || !stepDetails) {
			return true;
		}
		if (currentStep && isLineItemsAgreementStep(stepDetails, currentStep)) {
			return true;
		}
		const { ok, missingLabels, missingFieldIds } = validateRequiredAgreementFields(stepDetails, currentFieldValues);
		if (ok) {
			setFieldErrorsById({});
			return true;
		}
		setFieldErrorsById(Object.fromEntries(missingFieldIds.map((fieldId) => [fieldId, "This is required"])));
		const list = missingLabels.slice(0, 6).join(", ");
		const more = missingLabels.length > 6 ? ` (+${missingLabels.length - 6} more)` : "";
		toast.error(`Fill all required fields before continuing: ${list}${more}.`);
		return false;
	}, [canValidateCurrentStep, currentFieldValues, currentStep, stepDetails]);

	const persistCurrentStepFieldValues = useCallback(async (): Promise<boolean> => {
		if (!agreementId || !currentStep || !stepDetails) {
			return true;
		}
		/* Line items persist via POST/PATCH …/line-items only; field-values PATCH is rejected for this step. */
		if (isLineItemsAgreementStep(stepDetails, currentStep)) {
			return true;
		}
		if (!isAgreementFieldValuesStep(stepDetails)) {
			return true;
		}
		try {
			const of = fieldValuesPatchOfParam(stepDetails, currentStep);
			const values = buildAgreementFieldValuesPatchList(stepDetails, currentFieldValues);
			if (values.length === 0) return true;
			await patchFieldValuesMutation.mutateAsync({
				agreementId,
				body: { of, values },
			});
			return true;
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not save field values."));
			return false;
		}
	}, [agreementId, currentFieldValues, currentStep, patchFieldValuesMutation, stepDetails]);

	const goToStepIndex = useCallback(
		async (nextIndex: number) => {
			if (hideLineItemsWizardNav) {
				toast.info("Finish or cancel the line item editor first.");
				return;
			}
			if (nextIndex === activeStepIndex) return;
			if (nextIndex < 0 || nextIndex >= steps.length) return;
			if (nextIndex < activeStepIndex) {
				setActiveStepIndex(nextIndex);
				return;
			}
			if (stepDetailsLoading) {
				toast.info("Please wait for this step to finish loading.");
				return;
			}
			if (!assertCurrentStepValid()) return;
			const saved = await persistCurrentStepFieldValues();
			if (!saved) return;
			setActiveStepIndex(nextIndex);
		},
		[
			activeStepIndex,
			assertCurrentStepValid,
			hideLineItemsWizardNav,
			persistCurrentStepFieldValues,
			stepDetailsLoading,
			steps.length,
		]
	);

	useEffect(() => {
		if (!agreementId || !isMongoObjectIdString(agreementId) || !currentStep) {
			setStepDetails(null);
			setStepDetailsError(null);
			setStepDetailsLoading(false);
			return;
		}

		const of = agreementStepDetailsOfQuery(currentStep);
		let cancelled = false;
		setStepDetailsLoading(true);
		setStepDetailsError(null);
		setStepDetails(null);
		setFieldErrorsById({});

		const lineItemIdParam =
			lineItemQuery != null && lineItemQuery.trim() !== "" && lineItemQuery.trim().toLowerCase() !== "list"
				? lineItemQuery.trim()
				: undefined;

		void getAgreementStepDetails(agreementId, of, { lineItemId: lineItemIdParam })
			.then((data) => {
				if (cancelled) return;
				setStepDetails(data);
				setStepDetailsLoading(false);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setStepDetails(null);
				setStepDetailsLoading(false);
				const message =
					err instanceof ApiError && err.status === 404
						? err.message.trim() || "No layout found for this step."
						: formatUserFacingError(err, "Could not load fields for this step.");
				setStepDetailsError(message);
				toast.error(message, {
					toastId: `agreement-details-${agreementId}-${of}-${lineItemIdParam ?? "list"}`,
				});
			});

		return () => {
			cancelled = true;
		};
	}, [agreementId, currentStep?.id, currentStep?.name, lineItemQuery, stepDetailsNonce]);

	const stepperSteps: StepperStep[] = useMemo(
		() => steps.map((s) => ({ key: s.id, label: s.name })),
		[steps]
	);

	const isLastStep = steps.length > 0 && activeStepIndex === steps.length - 1;

	const lineItemEditorMode = useMemo<"create" | "edit">(() => {
		const m = stepDetails?.meta?.editorMode?.toLowerCase();
		if (m === "edit") return "edit";
		if (m === "create") return "create";
		if (lineItemQuery?.trim() === "new") return "create";
		return "edit";
	}, [lineItemQuery, stepDetails?.meta?.editorMode]);

	const lineItemEditorInitialValues = useMemo(() => {
		if (!stepDetails) return {};
		if (lineItemEditorMode === "edit") {
			return valuesRecordFromLineItemPayload(stepDetails.lineItem);
		}
		return emptyLineItemValuesFromLayout(stepDetails);
	}, [lineItemEditorMode, stepDetails]);

	const headerDisplayName = useMemo(() => {
		const name = dashboard?.agreement_display_name?.trim();
		if (name) return name;
		const did = dashboard?.displayId?.trim();
		return did || "New agreement";
	}, [dashboard?.agreement_display_name, dashboard?.displayId]);

	const headerDisplayId = useMemo(() => dashboard?.displayId?.trim() ?? "", [dashboard?.displayId]);

	const headerBreadcrumb = useMemo(() => {
		const parts = [
			dashboard?.agreement_category?.name,
			dashboard?.agreement_domain?.name,
			dashboard?.agreement_type?.name,
			dashboard?.agreement_subtype?.name,
		]
			.map((s) => (typeof s === "string" ? s.trim() : ""))
			.filter((s) => s.length > 0);
		return parts.join(" → ");
	}, [
		dashboard?.agreement_category?.name,
		dashboard?.agreement_domain?.name,
		dashboard?.agreement_subtype?.name,
		dashboard?.agreement_type?.name,
	]);

	const handleLineItemSave = useCallback(
		async (values: Record<string, unknown>) => {
			if (!agreementId || !stepDetails) return;
			const payload = fieldValuesArrayFromRecord(values);
			const editorMode = stepDetails.meta?.editorMode?.toLowerCase();
			const isCreate = editorMode === "create" || lineItemQuery?.trim() === "new";
			try {
				if (isCreate) {
					const res = await postLineItemMutation.mutateAsync({
						agreementId,
						body: { values: payload },
					});
					toast.success("Line item added.");
					const rid = [res.lineItemId, res.id, (res as { _id?: string })._id].find(
						(x): x is string => typeof x === "string" && isMongoObjectIdString(x.trim())
					);
					if (rid?.trim()) {
						setLineItemQuery(rid.trim());
					} else {
						setLineItemQuery(null);
						refreshStepDetails();
					}
				} else {
					const id = lineItemQuery?.trim();
					if (!id || !isMongoObjectIdString(id)) {
						toast.error("Missing line item id.");
						return;
					}
					await patchLineItemMutation.mutateAsync({
						agreementId,
						lineItemId: id,
						body: { values: payload },
					});
					toast.success("Line item saved.");
					setLineItemQuery(null);
					refreshStepDetails();
				}
			} catch (e) {
				toast.error(formatUserFacingError(e, "Could not save line item."));
			}
		},
		[
			agreementId,
			lineItemQuery,
			patchLineItemMutation,
			postLineItemMutation,
			refreshStepDetails,
			stepDetails,
		]
	);

	const handleConfirmDiscard = useCallback(async () => {
		if (!agreementId) return;
		try {
			const res = await deleteAgreementMutation.mutateAsync(agreementId);
			setDiscardConfirmOpen(false);
			if (res.deletedCount < res.requestedCount) {
				toast.info("This agreement was already removed.");
			} else {
				toast.success("Agreement discarded.");
			}
			void navigate("/agreements");
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not discard this agreement."));
		}
	}, [agreementId, deleteAgreementMutation, navigate]);

	const handlePrimaryAction = useCallback(async () => {
		if (hideLineItemsWizardNav) {
			toast.info("Finish or cancel the line item editor first.");
			return;
		}
		if (!isLastStep) {
			await goToStepIndex(activeStepIndex + 1);
			return;
		}
		if (!assertCurrentStepValid()) return;
		const saved = await persistCurrentStepFieldValues();
		if (!saved) return;
		toast.success("Agreement wizard completed.");
		void navigate("/agreements");
	}, [
		activeStepIndex,
		assertCurrentStepValid,
		goToStepIndex,
		hideLineItemsWizardNav,
		isLastStep,
		navigate,
		persistCurrentStepFieldValues,
	]);

	if (!agreementId || !isMongoObjectIdString(agreementId)) {
		return (
			<div className="flex flex-col gap-4">
				<Typography size="small" className="text-neutral-600 dark:text-neutral-400">
					{stepsError ?? "Invalid or missing agreement id."}
				</Typography>
			</div>
		);
	}

	if (stepsLoading) {
		return (
			<div className="flex min-h-[min(360px,calc(100vh-200px))] flex-1 items-center justify-center">
				<PageLoader mode="embedded" />
			</div>
		);
	}

	if (stepsError && steps.length === 0) {
		return (
			<div className="flex flex-col gap-4">
				<Typography size="small" className="text-neutral-600 dark:text-neutral-400">
					{stepsError}
				</Typography>
			</div>
		);
	}

	return (
		<>
			<CardMain className="flex min-h-0 flex-1 flex-col gap-0 !m-0 !p-0">
				<Card className="flex flex-col gap-4 p-4">
					<div className="flex items-center gap-3">
						<DescriptionOutlinedIcon
							sx={{ fontSize: 40 }}
							className="shrink-0 text-neutral-500 dark:text-neutral-400"
						/>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="text-lg font-semibold text-neutral-900 dark:text-white">
								{headerDisplayName}
							</span>
							{headerDisplayId || headerBreadcrumb ? (
								<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
									{headerDisplayId ? <span className="font-medium">{headerDisplayId}</span> : null}
									{headerDisplayId && headerBreadcrumb ? (
										<span aria-hidden className="text-neutral-400 dark:text-neutral-500">
											·
										</span>
									) : null}
									{headerBreadcrumb ? <span>{headerBreadcrumb}</span> : null}
								</div>
							) : null}
						</div>
					</div>
					{stepperSteps.length > 0 ? (
						<Stepper
							steps={stepperSteps}
							activeStep={activeStepIndex}
							onStepClick={(i) => {
								if (hideLineItemsWizardNav) {
									toast.info("Finish or cancel the line item editor first.");
									return;
								}
								void goToStepIndex(i);
							}}
							className="w-full"
						/>
					) : (
						<p className="text-sm text-neutral-500 dark:text-neutral-400">
							No steps are available yet. There may be no completed agreement configuration that matches this
							agreement. You can still discard the draft below.
						</p>
					)}
				</Card>

				<div className="m-4 flex min-h-0 flex-1 flex-col">
					<Card className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
						{currentStep ? (
							isClausesWizardStepName(currentStep) ? (
								<AgreementClausesStepPanel
									agreementId={agreementId}
									clauses={stepDetails?.clauses}
									loading={stepDetailsLoading}
									errorMessage={stepDetailsError}
									onRefresh={refreshStepDetails}
								/>
							) : isLineItemsWizardStepName(currentStep) ? (
								lineItemQuery ? (
									<AgreementLineItemEditorView
										key={`${lineItemQuery}-${stepDetailsNonce}`}
										details={stepDetails}
										mode={lineItemEditorMode}
										initialValuesByFieldId={lineItemEditorInitialValues}
										onCancel={() => setLineItemQuery(null)}
										onSave={(v) => void handleLineItemSave(v)}
										savePending={postLineItemMutation.isPending || patchLineItemMutation.isPending}
									/>
								) : (
									<AgreementLineItemsStepPanel
										details={stepDetails}
										loading={stepDetailsLoading}
										errorMessage={stepDetailsError}
										onNewClick={() => setLineItemQuery("new")}
										onRowClick={(rowId) => setLineItemQuery(rowId)}
									/>
								)
							) : (
								<AgreementStepDetailsForm
									details={stepDetails}
									loading={stepDetailsLoading}
									errorMessage={stepDetailsError}
									valuesByFieldId={currentFieldValues}
									errorsByFieldId={fieldErrorsById}
									onFieldValueChange={handleFieldValueChange}
								/>
							)
						) : (
							<p className="text-sm text-neutral-500 dark:text-neutral-400">No step selected.</p>
						)}
					</Card>
				</div>

				<Card className="mt-auto flex flex-wrap items-center justify-between gap-3 p-4">
					<button
						type="button"
						className="text-sm font-medium text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
						onClick={() => setDiscardConfirmOpen(true)}
					>
						Discard
					</button>
					{!hideLineItemsWizardNav ? (
						<div className="flex flex-wrap items-center justify-end gap-2">
							{activeStepIndex > 0 && (
								<Button
									type="button"
									size="md"
									appearance="outlined"
									status="secondary-neutral"
									onClick={() => void goToStepIndex(activeStepIndex - 1)}
								>
									Back
								</Button>
							)}
							<Button
								type="button"
								size="md"
								appearance="filled"
								status="primary"
								disabled={
									steps.length === 0 ||
									patchFieldValuesMutation.isPending ||
									postLineItemMutation.isPending ||
									patchLineItemMutation.isPending
								}
								loading={patchFieldValuesMutation.isPending}
								onClick={() => void handlePrimaryAction()}
							>
								{isLastStep ? "Create Agreement" : "Next"}
							</Button>
						</div>
					) : null}
				</Card>
			</CardMain>

			<ConfirmModal
				open={discardConfirmOpen}
				onClose={() => setDiscardConfirmOpen(false)}
				title="Discard this agreement?"
				cancelLabel="Cancel"
				confirmLabel="Discard agreement"
				confirmDanger
				width={480}
				pending={deleteAgreementMutation.isPending}
				onConfirm={() => void handleConfirmDiscard()}
			>
				<p className="mb-0 text-neutral-700 dark:text-neutral-300">
					If you continue, this agreement will be permanently deleted. This cannot be undone.
				</p>
			</ConfirmModal>
		</>
	);
}
