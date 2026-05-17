import { useCallback, useEffect, useId, useMemo, useState } from "react";
import cn from "classnames";
import { useParams } from "react-router-dom";
import { Switch } from "antd";
import { toast } from "react-toastify";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Button } from "../components/base/Button";
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
	usePatchAgreementFieldValuesMutation,
	usePatchAgreementLineItemMutation,
	usePostAgreementLineItemMutation,
	type AgreementDashboardData,
	type AgreementDocumentStep,
	type AgreementStepDetailsData,
} from "../api";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { Modal } from "../components/base/Modal";
import { PageLoader } from "../components/base/PageLoader";
import { Tabs, type TabItem } from "../components/base/Tabs";
import { Typography } from "../components/base/Typography";
import { AgreementClausesStepPanel } from "./agreementConfiguration/AgreementClausesStepPanel";
import { AgreementDashboardPanel } from "./agreementConfiguration/AgreementDashboardPanel";
import { AgreementLineItemEditorView } from "./agreementConfiguration/AgreementLineItemEditorView";
import { AgreementLineItemsStepPanel } from "./agreementConfiguration/AgreementLineItemsStepPanel";
import { AgreementStepDetailsForm } from "./agreementConfiguration/AgreementStepDetailsForm";
import { AgreementTeamsStepPanel } from "./agreementConfiguration/AgreementTeamsStepPanel";
import {
	emptyLineItemValuesFromLayout,
	fieldValuesArrayFromRecord,
	valuesRecordFromLineItemPayload,
} from "./agreementConfiguration/agreementLineItemsUtils";
import {
	agreementFieldValuesDiffer,
	buildInitialFieldValues,
	validateRequiredAgreementFields,
} from "./agreementConfiguration/agreementStepDetailsValidation";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { buildAgreementBreadcrumb } from "../lib/breadcrumb";

const AGREEMENT_DASHBOARD_TAB: AgreementDocumentStep = {
	id: "__agreement-dashboard__",
	name: "Dashboard",
	catalogStepName: "Dashboard",
};

const AGREEMENT_TEAMS_TAB: AgreementDocumentStep = {
	id: "__agreement-teams__",
	name: "Teams",
	catalogStepName: "Teams",
};

function isAgreementDashboardTab(step: AgreementDocumentStep | null | undefined): boolean {
	return step?.id === AGREEMENT_DASHBOARD_TAB.id;
}

function isAgreementTeamsTab(step: AgreementDocumentStep | null | undefined): boolean {
	return step?.id === AGREEMENT_TEAMS_TAB.id;
}

function formatAgreementStatusLabel(status: string): string {
	const raw = status.trim().toLowerCase();
	if (!raw) return "—";
	return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const AGREEMENT_STATUS_BADGE_COLORS: Record<string, string> = {
	Active: "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
	Draft: "bg-amber-100 text-amber-800 dark:bg-amber-950/90 dark:text-amber-200",
	Archived: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
	Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-200",
	Pending: "bg-primary-100 text-primary-700 dark:bg-primary-900/80 dark:text-primary-200",
};

function agreementStatusBadgeClass(status: string): string {
	const label = formatAgreementStatusLabel(status);
	return cn(
		"shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
		AGREEMENT_STATUS_BADGE_COLORS[label] ??
			"bg-primary-100 text-primary-700 dark:bg-primary-900/80 dark:text-primary-200"
	);
}

/** `/agreements/:id` — read/edit view of one agreement using tabs for each step. */
export default function AgreementDetailsPage() {
	const { id: agreementIdParam } = useParams<{ id: string }>();
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
	const [activeTabKey, setActiveTabKey] = useState<string>("");

	const [stepDetails, setStepDetails] = useState<AgreementStepDetailsData | null>(null);
	const [stepDetailsLoading, setStepDetailsLoading] = useState(false);
	const [stepDetailsError, setStepDetailsError] = useState<string | null>(null);
	const [fieldValuesByStepId, setFieldValuesByStepId] = useState<Record<string, Record<string, unknown>>>({});
	const [fieldErrorsById, setFieldErrorsById] = useState<Record<string, string>>({});
	const [lineItemQuery, setLineItemQuery] = useState<string | null>(null);
	const [stepDetailsNonce, setStepDetailsNonce] = useState(0);
	const [isEditMode, setIsEditMode] = useState(false);
	const [pendingTabKey, setPendingTabKey] = useState<string | null>(null);
	const tabChangeModalTitleId = useId();

	const refreshStepDetails = useCallback(() => {
		setStepDetailsNonce((n) => n + 1);
	}, []);

	useEffect(() => {
		setFieldValuesByStepId({});
		setLineItemQuery(null);
		setActiveTabKey("");
		setIsEditMode(false);
		setPendingTabKey(null);
	}, [agreementId]);

	useEffect(() => {
		if (!isEditMode) setPendingTabKey(null);
	}, [isEditMode]);

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
				toast.error(message, { toastId: `agreement-details-steps-${agreementId}` });
			});

		return () => {
			cancelled = true;
		};
	}, [agreementId]);

	const tabSteps = useMemo(
		() => [AGREEMENT_DASHBOARD_TAB, ...steps, AGREEMENT_TEAMS_TAB],
		[steps]
	);

	useEffect(() => {
		if (tabSteps.length === 0) return;
		setActiveTabKey((prev) => {
			if (prev && tabSteps.some((s) => s.id === prev)) return prev;
			return tabSteps[0].id;
		});
	}, [tabSteps]);

	const currentStep = useMemo(
		() => tabSteps.find((s) => s.id === activeTabKey) ?? null,
		[activeTabKey, tabSteps]
	);
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

	const hasUnsavedChanges = useMemo(() => {
		if (!isEditMode || stepDetailsLoading || !currentStep || !stepDetails) return false;
		if (isAgreementDashboardTab(currentStep) || isAgreementTeamsTab(currentStep)) return false;
		if (isClausesWizardStepName(currentStep) || isLineItemsWizardStepName(currentStep)) return false;
		if (!isAgreementFieldValuesStep(stepDetails)) return false;
		const baseline = buildInitialFieldValues(stepDetails);
		return agreementFieldValuesDiffer(baseline, currentFieldValues);
	}, [
		currentFieldValues,
		currentStep,
		isEditMode,
		stepDetails,
		stepDetailsLoading,
	]);

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
		if (!canValidateCurrentStep || !stepDetails) return true;
		if (currentStep && isLineItemsAgreementStep(stepDetails, currentStep)) return true;
		const { ok, missingLabels, missingFieldIds } = validateRequiredAgreementFields(
			stepDetails,
			currentFieldValues
		);
		if (ok) {
			setFieldErrorsById({});
			return true;
		}
		setFieldErrorsById(Object.fromEntries(missingFieldIds.map((fieldId) => [fieldId, "This is required"])));
		const list = missingLabels.slice(0, 6).join(", ");
		const more = missingLabels.length > 6 ? ` (+${missingLabels.length - 6} more)` : "";
		toast.error(`Fill all required fields before switching tabs: ${list}${more}.`);
		return false;
	}, [canValidateCurrentStep, currentFieldValues, currentStep, stepDetails]);

	const persistCurrentStepFieldValues = useCallback(async (): Promise<boolean> => {
		if (!agreementId || !currentStep || !stepDetails) return true;
		if (isLineItemsAgreementStep(stepDetails, currentStep)) return true;
		if (!isAgreementFieldValuesStep(stepDetails)) return true;
		try {
			const of = fieldValuesPatchOfParam(stepDetails, currentStep);
			const values = buildAgreementFieldValuesPatchList(stepDetails, currentFieldValues);
			if (values.length === 0) return true;
			await patchFieldValuesMutation.mutateAsync({ agreementId, body: { of, values } });
			return true;
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not save field values."));
			return false;
		}
	}, [agreementId, currentFieldValues, currentStep, patchFieldValuesMutation, stepDetails]);

	const discardCurrentStepEdits = useCallback(() => {
		setFieldErrorsById({});
		if (!stepStorageKey) return;
		setFieldValuesByStepId((prev) => {
			const next = { ...prev };
			delete next[stepStorageKey];
			return next;
		});
	}, [stepStorageKey]);

	const handleTabChange = useCallback(
		(nextKey: string) => {
			if (!nextKey || nextKey === activeTabKey) return;
			if (hideLineItemsWizardNav) {
				toast.info("Finish or cancel the line item editor first.");
				return;
			}
			if (stepDetailsLoading) {
				toast.info("Please wait for this tab to finish loading.");
				return;
			}
			if (isEditMode && hasUnsavedChanges) {
				setPendingTabKey(nextKey);
				return;
			}
			setActiveTabKey(nextKey);
		},
		[activeTabKey, hasUnsavedChanges, hideLineItemsWizardNav, isEditMode, stepDetailsLoading]
	);

	const pendingTabLabel = useMemo(() => {
		if (!pendingTabKey) return "";
		return tabSteps.find((s) => s.id === pendingTabKey)?.name?.trim() || "tab";
	}, [pendingTabKey, tabSteps]);

	const isTabChangeSaving = patchFieldValuesMutation.isPending && pendingTabKey !== null;

	const closeTabChangeModal = useCallback(() => {
		if (!isTabChangeSaving) setPendingTabKey(null);
	}, [isTabChangeSaving]);

	const completePendingTabChange = useCallback(() => {
		if (!pendingTabKey) return;
		setActiveTabKey(pendingTabKey);
		setPendingTabKey(null);
	}, [pendingTabKey]);

	const handleTabSaveAndProceed = useCallback(async () => {
		if (!pendingTabKey) return;
		if (!assertCurrentStepValid()) return;
		const saved = await persistCurrentStepFieldValues();
		if (!saved) return;
		discardCurrentStepEdits();
		completePendingTabChange();
	}, [
		assertCurrentStepValid,
		completePendingTabChange,
		discardCurrentStepEdits,
		pendingTabKey,
		persistCurrentStepFieldValues,
	]);

	const handleTabConfirmExit = useCallback(() => {
		if (!pendingTabKey || isTabChangeSaving) return;
		discardCurrentStepEdits();
		completePendingTabChange();
	}, [completePendingTabChange, discardCurrentStepEdits, isTabChangeSaving, pendingTabKey]);

	const enterEditMode = useCallback(() => {
		setIsEditMode(true);
	}, []);

	const cancelEditMode = useCallback(() => {
		setIsEditMode(false);
		setLineItemQuery(null);
		setPendingTabKey(null);
		discardCurrentStepEdits();
		refreshStepDetails();
	}, [discardCurrentStepEdits, refreshStepDetails]);

	const handleSaveEdit = useCallback(async () => {
		if (hideLineItemsWizardNav) {
			toast.info("Finish or cancel the line item editor first.");
			return;
		}
		if (!assertCurrentStepValid()) return;
		const saved = await persistCurrentStepFieldValues();
		if (!saved) return;
		if (stepStorageKey) {
			setFieldValuesByStepId((prev) => {
				const next = { ...prev };
				delete next[stepStorageKey];
				return next;
			});
		}
		refreshStepDetails();
		toast.success("Changes saved.");
		setIsEditMode(false);
	}, [
		assertCurrentStepValid,
		hideLineItemsWizardNav,
		persistCurrentStepFieldValues,
		refreshStepDetails,
		stepStorageKey,
	]);

	const isSaving = patchFieldValuesMutation.isPending;

	useEffect(() => {
		if (!agreementId || !isMongoObjectIdString(agreementId) || !currentStep) {
			setStepDetails(null);
			setStepDetailsError(null);
			setStepDetailsLoading(false);
			return;
		}
		if (isAgreementDashboardTab(currentStep) || isAgreementTeamsTab(currentStep)) {
			setStepDetails(null);
			setStepDetailsError(null);
			setStepDetailsLoading(false);
			setFieldErrorsById({});
			return;
		}

		const of = agreementStepDetailsOfQuery(currentStep);
		let cancelled = false;
		setStepDetailsLoading(true);
		setStepDetailsError(null);
		setStepDetails(null);
		setFieldErrorsById({});

		const lineItemIdParam =
			lineItemQuery != null &&
			lineItemQuery.trim() !== "" &&
			lineItemQuery.trim().toLowerCase() !== "list"
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
					toastId: `agreement-details-tab-${agreementId}-${of}-${lineItemIdParam ?? "list"}`,
				});
			});

		return () => {
			cancelled = true;
		};
	}, [agreementId, currentStep?.id, currentStep?.name, lineItemQuery, stepDetailsNonce]);

	const tabItems: TabItem[] = useMemo(
		() => tabSteps.map((s) => ({ key: s.id, label: s.name?.trim() || "Step" })),
		[tabSteps]
	);

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
		return did || "Agreement";
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

	const navbarBreadcrumb = useMemo(
		() =>
			buildAgreementBreadcrumb({
				categoryId: dashboard?.agreement_category?._id,
				categoryName: dashboard?.agreement_category?.name,
				domainId: dashboard?.agreement_domain?._id,
				domainName: dashboard?.agreement_domain?.name,
				displayName: headerDisplayName,
			}),
		[
			dashboard?.agreement_category?._id,
			dashboard?.agreement_category?.name,
			dashboard?.agreement_domain?._id,
			dashboard?.agreement_domain?.name,
			headerDisplayName,
		]
	);
	usePageBreadcrumb(navbarBreadcrumb);

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
		<CardMain className="flex min-h-0 flex-1 flex-col gap-0 !m-0 !p-0">
			{!isEditMode ? (
				<div
					role="status"
					className="flex items-center justify-center gap-2 border-b border-primary-200 bg-primary-50 px-3 py-1.5 text-center text-xs leading-snug text-primary-900 shadow-sm sm:text-sm dark:border-black-600 dark:bg-black-800 dark:text-neutral-200 dark:shadow-none"
				>
					<VisibilityOutlinedIcon
						sx={{ fontSize: 18 }}
						className="shrink-0 text-primary-600 dark:text-neutral-300"
						aria-hidden
					/>
					<p className="m-0">
						<span className="font-semibold text-primary-800 dark:text-white">View mode</span>
						<span className="text-primary-800/95 dark:text-neutral-200">
							{" — Enable "}
							<span className="font-bold text-primary-700 dark:text-white">Edit</span>
							{" to make changes to this agreement."}
						</span>
					</p>
				</div>
			) : null}
			<Card className="flex flex-col gap-4 p-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<DescriptionOutlinedIcon
							sx={{ fontSize: 40 }}
							className="shrink-0 text-neutral-500 dark:text-neutral-400"
						/>
						<div className="flex min-w-0 flex-col gap-0.5">
							<div className="flex min-w-0 flex-wrap items-center gap-2">
								<span className="truncate text-lg font-semibold text-neutral-900 dark:text-white">
									{headerDisplayName}
								</span>
								{dashboard?.status ? (
									<span className={agreementStatusBadgeClass(dashboard.status)}>
										{formatAgreementStatusLabel(dashboard.status)}
									</span>
								) : null}
							</div>
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
					<div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
						{isEditMode ? (
							<Button
								type="button"
								size="sm"
								onClick={() => void handleSaveEdit()}
								loading={isSaving}
								disabled={!hasUnsavedChanges}
							>
								Save Changes
							</Button>
						) : null}
						<div className="flex items-center gap-2">
							<Switch
								size="small"
								checked={isEditMode}
								onChange={(checked) => {
									if (checked) enterEditMode();
									else cancelEditMode();
								}}
							/>
							<span className="text-sm text-neutral-600 dark:text-neutral-400">Edit</span>
						</div>
					</div>
				</div>
				{tabItems.length > 0 ? (
					<Tabs
						items={tabItems}
						activeKey={activeTabKey}
						onChange={(key) => void handleTabChange(key)}
						variant="underline"
						size="md"
					/>
				) : (
					<p className="text-sm text-neutral-500 dark:text-neutral-400">
						No tabs are available for this agreement yet.
					</p>
				)}
			</Card>

			<div className="m-4 flex min-h-0 flex-1 flex-col">
				{currentStep && isAgreementDashboardTab(currentStep) ? (
					<div className="flex min-h-0 flex-1 flex-col overflow-auto">
						<AgreementDashboardPanel
							agreementId={agreementId}
							dashboard={dashboard}
							dashboardLoading={dashboardQuery.isPending}
							dashboardError={
								dashboardQuery.isError
									? formatUserFacingError(dashboardQuery.error, "Could not load agreement overview.")
									: null
							}
						/>
					</div>
				) : (
					<Card className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
						{currentStep ? (
							isAgreementTeamsTab(currentStep) ? (
								<AgreementTeamsStepPanel agreementId={agreementId} readOnly={!isEditMode} />
							) : isClausesWizardStepName(currentStep) ? (
								<AgreementClausesStepPanel
									agreementId={agreementId}
									clauses={stepDetails?.clauses}
									loading={stepDetailsLoading}
									errorMessage={stepDetailsError}
									onRefresh={refreshStepDetails}
									readOnly={!isEditMode}
								/>
							) : isLineItemsWizardStepName(currentStep) ? (
								lineItemQuery && isEditMode ? (
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
										readOnly={!isEditMode}
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
									readOnly={!isEditMode}
									onFieldValueChange={handleFieldValueChange}
								/>
							)
						) : (
							<p className="text-sm text-neutral-500 dark:text-neutral-400">No tab selected.</p>
						)}
					</Card>
				)}
			</div>

			<Modal
				open={pendingTabKey !== null}
				onCancel={closeTabChangeModal}
				width={480}
				maskClosable={!isTabChangeSaving}
				keyboard={!isTabChangeSaving}
				aria-labelledby={tabChangeModalTitleId}
				header={
					<h2
						id={tabChangeModalTitleId}
						className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white"
					>
						Leave this tab?
					</h2>
				}
				footer={
					<div className="flex w-full flex-wrap items-center justify-between gap-3">
						<Button
							type="button"
							size="md"
							appearance="outlined"
							status="secondary-neutral"
							onClick={closeTabChangeModal}
							disabled={isTabChangeSaving}
						>
							Cancel
						</Button>
						<div className="flex flex-wrap items-center justify-end gap-3">
							<Button
								type="button"
								size="md"
								appearance="filled"
								status="primary"
								loading={isTabChangeSaving}
								disabled={isTabChangeSaving}
								onClick={() => void handleTabSaveAndProceed()}
							>
								Save and Proceed
							</Button>
							<Button
								type="button"
								size="md"
								appearance="outlined"
								status="secondary-neutral"
								onClick={handleTabConfirmExit}
								disabled={isTabChangeSaving}
							>
								Confirm Exit
							</Button>
						</div>
					</div>
				}
			>
				<p className="mb-0 text-sm text-neutral-600 dark:text-neutral-300">
					You have unsaved changes on this tab. If you switch to{" "}
					<span className="font-medium text-neutral-900 dark:text-white">{pendingTabLabel}</span>{" "}
					without saving, your changes will be lost.
				</p>
			</Modal>
		</CardMain>
	);
}
