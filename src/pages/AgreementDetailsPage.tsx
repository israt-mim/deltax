import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
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
	buildInitialFieldValues,
	validateRequiredAgreementFields,
} from "./agreementConfiguration/agreementStepDetailsValidation";

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

/** `/agreements/:id` — read/edit view of one agreement using tabs for each step. */
export default function AgreementDetailsPage() {
	const { id: agreementIdParam } = useParams<{ id: string }>();
	const navigate = useNavigate();
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

	const refreshStepDetails = useCallback(() => {
		setStepDetailsNonce((n) => n + 1);
	}, []);

	useEffect(() => {
		setFieldValuesByStepId({});
		setLineItemQuery(null);
		setActiveTabKey("");
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

	const handleTabChange = useCallback(
		async (nextKey: string) => {
			if (!nextKey || nextKey === activeTabKey) return;
			if (hideLineItemsWizardNav) {
				toast.info("Finish or cancel the line item editor first.");
				return;
			}
			if (stepDetailsLoading) {
				toast.info("Please wait for this tab to finish loading.");
				return;
			}
			if (!assertCurrentStepValid()) return;
			const saved = await persistCurrentStepFieldValues();
			if (!saved) return;
			setActiveTabKey(nextKey);
		},
		[
			activeTabKey,
			assertCurrentStepValid,
			hideLineItemsWizardNav,
			persistCurrentStepFieldValues,
			stepDetailsLoading,
		]
	);

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
			<Card className="flex flex-col gap-4 p-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<button
							type="button"
							aria-label="Back to agreements"
							className="flex shrink-0 rounded-md p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-black-600"
							onClick={() => void navigate("/agreements")}
						>
							<ArrowBackOutlinedIcon sx={{ fontSize: 22 }} />
						</button>
						<DescriptionOutlinedIcon
							sx={{ fontSize: 40 }}
							className="shrink-0 text-neutral-500 dark:text-neutral-400"
						/>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate text-lg font-semibold text-neutral-900 dark:text-white">
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
					{dashboard?.status ? (
						<span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-700 dark:bg-black-600 dark:text-neutral-300">
							{dashboard.status}
						</span>
					) : null}
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
								<AgreementTeamsStepPanel agreementId={agreementId} />
							) : isClausesWizardStepName(currentStep) ? (
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
							<p className="text-sm text-neutral-500 dark:text-neutral-400">No tab selected.</p>
						)}
					</Card>
				)}
			</div>
		</CardMain>
	);
}
