import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
	ApiError,
	agreementStepDetailsOfQuery,
	getAgreementStepDetails,
	getAgreementSteps,
	isMongoObjectIdString,
	useDeleteAgreementMutation,
	type AgreementDocumentStep,
	type AgreementStepDetailsData,
} from "../api";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Button } from "../components/base/Button";
import { CardMain } from "../components/base/CardMain";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { PageLoader } from "../components/base/PageLoader";
import { Stepper, type StepperStep } from "../components/base/Stepper";
import { Typography } from "../components/base/Typography";
import { AgreementStepDetailsForm } from "./agreementConfiguration/AgreementStepDetailsForm";
import {
	buildInitialFieldValues,
	validateRequiredAgreementFields,
} from "./agreementConfiguration/agreementStepDetailsValidation";

/** `/agreements/create/:id` — `id` is the Agreement document ObjectId. */
export default function CreateAgreementDetailsPage() {
	const { id: agreementIdParam } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const deleteAgreementMutation = useDeleteAgreementMutation();

	const agreementId = agreementIdParam?.trim() ?? "";

	const [steps, setSteps] = useState<AgreementDocumentStep[]>([]);
	const [stepsLoading, setStepsLoading] = useState(true);
	const [stepsError, setStepsError] = useState<string | null>(null);
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

	const [stepDetails, setStepDetails] = useState<AgreementStepDetailsData | null>(null);
	const [stepDetailsLoading, setStepDetailsLoading] = useState(false);
	const [stepDetailsError, setStepDetailsError] = useState<string | null>(null);
	const [fieldValuesByStepId, setFieldValuesByStepId] = useState<Record<string, Record<string, unknown>>>({});

	useEffect(() => {
		setFieldValuesByStepId({});
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
				setSteps(Array.isArray(res.steps) ? res.steps : []);
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
		},
		[stepStorageKey, stepDetails]
	);

	const canValidateCurrentStep = Boolean(stepDetails && !stepDetailsError && !stepDetailsLoading);

	const assertCurrentStepValid = useCallback((): boolean => {
		if (!canValidateCurrentStep || !stepDetails) {
			return true;
		}
		const { ok, missingLabels } = validateRequiredAgreementFields(stepDetails, currentFieldValues);
		if (ok) return true;
		const list = missingLabels.slice(0, 6).join(", ");
		const more = missingLabels.length > 6 ? ` (+${missingLabels.length - 6} more)` : "";
		toast.error(`Fill all required fields before continuing: ${list}${more}.`);
		return false;
	}, [canValidateCurrentStep, currentFieldValues, stepDetails]);

	const goToStepIndex = useCallback(
		(nextIndex: number) => {
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
			setActiveStepIndex(nextIndex);
		},
		[activeStepIndex, assertCurrentStepValid, stepDetailsLoading, steps.length]
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

		void getAgreementStepDetails(agreementId, of)
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
				toast.error(message, { toastId: `agreement-details-${agreementId}-${of}` });
			});

		return () => {
			cancelled = true;
		};
	}, [agreementId, currentStep?.id, currentStep?.name]);

	const stepperSteps: StepperStep[] = useMemo(
		() => steps.map((s) => ({ key: s.id, label: s.name })),
		[steps]
	);

	const isLastStep = steps.length > 0 && activeStepIndex === steps.length - 1;

	const headerSubtitle = useMemo(() => {
		const parts: string[] = [];
		if (stepDetails?.agreementConfigDisplayId?.trim()) {
			parts.push(stepDetails.agreementConfigDisplayId.trim());
		}
		if (currentStep?.name?.trim()) {
			parts.push(currentStep.name.trim());
		}
		return parts.join(" · ");
	}, [currentStep?.name, stepDetails?.agreementConfigDisplayId]);

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

	const handlePrimaryAction = useCallback(() => {
		if (!isLastStep) {
			goToStepIndex(activeStepIndex + 1);
			return;
		}
		if (!assertCurrentStepValid()) return;
		toast.success("Agreement wizard completed.");
		void navigate("/agreements");
	}, [activeStepIndex, assertCurrentStepValid, goToStepIndex, isLastStep, navigate]);

	if (!agreementId || !isMongoObjectIdString(agreementId)) {
		return (
			<CardMain className="flex flex-col gap-4">
				<Typography size="small" className="text-neutral-600 dark:text-neutral-400">
					{stepsError ?? "Invalid or missing agreement id."}
				</Typography>
			</CardMain>
		);
	}

	if (stepsLoading) {
		return (
			<CardMain className="flex min-h-[min(360px,calc(100vh-200px))] flex-1 items-center justify-center">
				<PageLoader mode="embedded" />
			</CardMain>
		);
	}

	if (stepsError && steps.length === 0) {
		return (
			<CardMain className="flex flex-col gap-4">
				<Typography size="small" className="text-neutral-600 dark:text-neutral-400">
					{stepsError}
				</Typography>
			</CardMain>
		);
	}

	return (
		<>
			<CardMain className="flex min-h-0 flex-1 flex-col gap-0">
				<div className="flex flex-col gap-4 pb-4">
					<div className="flex flex-wrap items-center gap-2 gap-y-1">
						<DescriptionOutlinedIcon sx={{ fontSize: 22 }} className="text-neutral-500 dark:text-neutral-400" />
						<span className="text-lg font-semibold text-neutral-900 dark:text-white">New agreement</span>
					</div>
					{headerSubtitle ? (
						<Typography size="small" variant="regular" className="text-neutral-600 dark:text-neutral-400">
							{headerSubtitle}
						</Typography>
					) : (
						<Typography size="small" variant="regular" className="text-neutral-600 dark:text-neutral-400">
							Follow each step to build this agreement. Fields load from the matching completed configuration.
						</Typography>
					)}
					{stepperSteps.length > 0 ? (
						<Stepper
							steps={stepperSteps}
							activeStep={activeStepIndex}
							onStepClick={goToStepIndex}
							className="w-full pt-1"
						/>
					) : (
						<p className="text-sm text-neutral-500 dark:text-neutral-400">
							No steps are available yet. There may be no completed agreement configuration that matches this
							agreement. You can still discard the draft below.
						</p>
					)}
				</div>

				<div className="min-h-0 flex-1 overflow-auto py-2">
					{currentStep ? (
						<AgreementStepDetailsForm
							details={stepDetails}
							loading={stepDetailsLoading}
							errorMessage={stepDetailsError}
							valuesByFieldId={currentFieldValues}
							onFieldValueChange={handleFieldValueChange}
						/>
					) : (
						<p className="text-sm text-neutral-500 dark:text-neutral-400">No step selected.</p>
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
						{activeStepIndex > 0 && (
							<Button
								type="button"
								size="md"
								appearance="outlined"
								status="secondary-neutral"
								onClick={() => goToStepIndex(activeStepIndex - 1)}
							>
								Back
							</Button>
						)}
						<Button
							type="button"
							size="md"
							appearance="filled"
							status="primary"
							disabled={steps.length === 0}
							onClick={() => void handlePrimaryAction()}
						>
							{isLastStep ? "Create Agreement" : "Next"}
						</Button>
					</div>
				</div>
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
