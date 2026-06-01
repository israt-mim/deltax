import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import cn from "classnames";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Dropdown, Switch } from "antd";
import type { MenuProps } from "antd";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DriveFileRenameOutlineOutlinedIcon from "@mui/icons-material/DriveFileRenameOutlineOutlined";
import FullscreenExitOutlinedIcon from "@mui/icons-material/FullscreenExitOutlined";
import FullscreenOutlinedIcon from "@mui/icons-material/FullscreenOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Button } from "../components/base/Button";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { FloatingBar } from "../components/base/FloatingBar";
import { createStickyActionsColumn } from "../components/modules/settings/stickyActionsColumn";
import {
	agreementStepDetailsOfQuery,
	agreementStepEditorHideWizardNav,
	buildAgreementTabDescriptors,
	buildAgreementFieldValuesPatchList,
	resolveAgreementTabKeyFromUrl,
	fieldValuesPatchOfParam,
	invalidateAgreementStepDetailsQueries,
	formatAgreementStepDetailsQueryError,
	isAgreementFieldValuesStep,
	isClausesWizardStepName,
	isLineItemsAgreementStep,
	isLineItemsWizardStepName,
	isMongoObjectIdString,
	normalizeAgreementLineItemIdForQuery,
	useAgreementDashboardQuery,
	useAgreementDocumentStepsQuery,
	useAgreementStepDetailsQuery,
	usePatchAgreementFieldValuesMutation,
	usePatchAgreementLineItemMutation,
	usePostAgreementLineItemMutation,
	type AgreementDashboardData,
	type AgreementDocumentStep,
} from "../api";
import { useAgreementDataQuery, useDeleteAgreementMutation } from "../api/hooks/agreements";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { Modal } from "../components/base/Modal";
import { AgreementDetailsPageSkeleton } from "../components/skeletons";
import { Tabs, type TabItem } from "../components/base/Tabs";
import { Typography } from "../components/base/Typography";
import { AgreementClausesStepPanel } from "./agreementConfiguration/AgreementClausesStepPanel";
import { AgreementDashboardPanel } from "./agreementConfiguration/AgreementDashboardPanel";
import { AgreementLineItemEditorView } from "./agreementConfiguration/AgreementLineItemEditorView";
import { AgreementLineItemsStepPanel } from "./agreementConfiguration/AgreementLineItemsStepPanel";
import { AgreementStepDetailsForm } from "./agreementConfiguration/AgreementStepDetailsForm";
import { AgreementTeamsStepPanel } from "./agreementConfiguration/AgreementTeamsStepPanel";
import { AgreementAttachmentsStepPanel } from "./agreementConfiguration/AgreementAttachmentsStepPanel";
import { AgreementAttachmentDocPreview } from "./agreementConfiguration/AgreementAttachmentDocPreview";
import {
	ResizableSidebar,
	RESIZABLE_SIDEBAR_DEFAULT_WIDTH,
	RESIZABLE_SIDEBAR_MAX_WIDTH,
	RESIZABLE_SIDEBAR_MIN_WIDTH,
} from "../components/base/ResizableSidebar";
import {
	attachmentDisplayName,
	canPreviewAttachment,
} from "../lib/attachmentDocument";
import type { AgreementAttachment } from "../api";
import { useDeleteTemplateMutation, useTemplatesInfiniteList } from "../api/hooks/templates";
import type { TemplateRow } from "../api/services/templates";
import { TemplateEditorSidebar, type TemplateEditorSidebarHandle } from "./templates/TemplateEditorSidebar";
import { InfiniteTable } from "../components/base/InfiniteTable";
import type { ColumnDef } from "@tanstack/react-table";
import { NewTemplateModal } from "./templates/NewTemplateModal";
import type { LockedCdts } from "./templates/NewTemplateModal";
import { UserIdentity } from "../components/UserIdentity";
import type { ApiUserRef } from "../lib/userDisplay";
import { formatUsDateTime } from "../lib/formatDateTime";
import type { TemplateUserRef } from "../api/services/templates";
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
import { NAVBAR_HEIGHT } from "../constants/global";

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

const AGREEMENT_ATTACHMENTS_TAB: AgreementDocumentStep = {
	id: "__agreement-attachments__",
	name: "Attachments",
	catalogStepName: "Attachments",
};

const TAB_QUERY_PARAM = "tab";
const DASHBOARD_TAB_KEY = "dashboard";

function applyTabToSearchParams(params: URLSearchParams, tabKey: string): void {
	if (tabKey === DASHBOARD_TAB_KEY) {
		params.delete(TAB_QUERY_PARAM);
	} else {
		params.set(TAB_QUERY_PARAM, tabKey);
	}
}

function isAgreementDashboardTab(step: AgreementDocumentStep | null | undefined): boolean {
	return step?.id === AGREEMENT_DASHBOARD_TAB.id;
}

function isAgreementTeamsTab(step: AgreementDocumentStep | null | undefined): boolean {
	return step?.id === AGREEMENT_TEAMS_TAB.id;
}

function isAgreementAttachmentsTab(step: AgreementDocumentStep | null | undefined): boolean {
	return step?.id === AGREEMENT_ATTACHMENTS_TAB.id;
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

const AUTHORING_SIDEBAR_COLUMNS: ColumnDef<TemplateRow, unknown>[] = [
	{
		id: "name",
		header: "Name",
		size: 200,
		minSize: 120,
		cell: ({ row }) => (
			<span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
				{row.original.name}
			</span>
		),
	},
	{
		id: "description",
		header: "Description",
		size: 180,
		minSize: 100,
		cell: ({ row }) => (
			<span className="block max-w-[180px] truncate text-neutral-500 dark:text-neutral-400">
				{row.original.description || "—"}
			</span>
		),
	},
	{
		id: "createdBy",
		header: "Created By",
		size: 150,
		minSize: 100,
		cell: ({ row }) => (
			<UserIdentity
				user={row.original.createdBy as TemplateUserRef | null as ApiUserRef | null}
				size="sm"
			/>
		),
	},
	{
		id: "createdAt",
		header: "Created On",
		size: 150,
		minSize: 110,
		cell: ({ row }) => (
			<span className="text-neutral-500 dark:text-neutral-400">
				{formatUsDateTime(row.original.createdAt)}
			</span>
		),
	},
];

function AuthoringSidebarHeader({
	fullscreen,
	onFullscreenToggle,
	onClose,
}: {
	fullscreen: boolean;
	onFullscreenToggle: () => void;
	onClose: () => void;
}) {
	return (
		<div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-black-600">
			<span className="text-base font-semibold text-neutral-900 dark:text-white">Authoring</span>
			<div className="flex items-center gap-1">
				<button
					type="button"
					title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
					onClick={onFullscreenToggle}
					className="inline-flex items-center justify-center rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-black-600 dark:hover:text-neutral-200"
				>
					{fullscreen ? <FullscreenExitOutlinedIcon sx={{ fontSize: 20 }} /> : <FullscreenOutlinedIcon sx={{ fontSize: 20 }} />}
				</button>
				<button
					type="button"
					title="Close"
					onClick={onClose}
					className="inline-flex items-center justify-center rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-black-600 dark:hover:text-neutral-200"
				>
					<CloseOutlinedIcon sx={{ fontSize: 20 }} />
				</button>
			</div>
		</div>
	);
}

function AuthoringSidebarBody({
	loading,
	rows,
	onNewDocument,
	onSelectTemplate,
}: {
	loading: boolean;
	rows: TemplateRow[];
	onNewDocument: () => void;
	onSelectTemplate: (id: string) => void;
}) {
	const deleteTemplateMutation = useDeleteTemplateMutation();
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [pendingDelete, setPendingDelete] = useState<TemplateRow | null>(null);

	const clearSelection = useCallback(() => setCheckedIds(new Set()), []);

	const handleBulkDelete = useCallback(async () => {
		const ids = [...checkedIds];
		let failed = 0;
		for (const id of ids) {
			try {
				await deleteTemplateMutation.mutateAsync(id);
			} catch {
				failed++;
			}
		}
		if (failed === 0) toast.success(`${ids.length} document${ids.length !== 1 ? "s" : ""} deleted.`);
		else toast.error(`${failed} document${failed !== 1 ? "s" : ""} could not be deleted.`);
		clearSelection();
	}, [checkedIds, deleteTemplateMutation, clearSelection]);

	const handleConfirmDelete = useCallback(async () => {
		if (!pendingDelete) return;
		try {
			await deleteTemplateMutation.mutateAsync(pendingDelete.id);
			toast.success("Document deleted.");
			setCheckedIds((prev) => {
				const next = new Set(prev);
				next.delete(pendingDelete.id);
				return next;
			});
			setPendingDelete(null);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete document."));
		}
	}, [deleteTemplateMutation, pendingDelete]);

	const actionsColumn = useMemo(
		() =>
			createStickyActionsColumn<TemplateRow>(({ row }) => {
				const items: import("antd").MenuProps["items"] = [
					{
						key: "open",
						icon: <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />,
						label: "Open",
					},
					{
						key: "delete",
						icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
						label: "Delete",
						danger: true,
					},
				];
				return (
					<div
						className="flex items-center justify-center"
						data-row-click-ignore
						onClick={(e) => e.stopPropagation()}
					>
						<Dropdown
							trigger={["click"]}
							classNames={{ root: "actions-dropdown-icon" }}
							menu={{
								items,
								onClick: ({ key, domEvent }) => {
									domEvent.preventDefault();
									domEvent.stopPropagation();
									if (key === "open") onSelectTemplate(row.original.id);
									if (key === "delete") setPendingDelete(row.original);
								},
							}}
						>
							<button
								type="button"
								aria-label="Document actions"
								className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
							>
								<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
							</button>
						</Dropdown>
					</div>
				);
			}),
		[onSelectTemplate]
	);

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
				Loading…
			</div>
		);
	}

	if (rows.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
				<AuthoringEmptyIllustration />
				<p className="mt-2 text-lg font-bold text-neutral-900 dark:text-white">No Documents Created Yet</p>
				<p className="text-sm text-neutral-500 dark:text-neutral-400">Create your first document to get started!</p>
				<Button
					type="button"
					size="md"
					className="!rounded-full !h-auto !py-2.5"
					onClick={onNewDocument}
				>
					<AddOutlinedIcon sx={{ fontSize: 16 }} />
					New Document
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
			<div className="flex shrink-0 items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
					{rows.length} document{rows.length !== 1 ? "s" : ""}
				</span>
				<Button
					type="button"
					size="sm"
					className="!rounded-full !h-auto !py-2"
					onClick={onNewDocument}
				>
					<AddOutlinedIcon sx={{ fontSize: 14 }} />
					New Document
				</Button>
			</div>

			<FloatingBar
				open={checkedIds.size > 0}
				selectedCount={checkedIds.size}
				onClearSelection={clearSelection}
				onDelete={() => void handleBulkDelete()}
				deletePending={deleteTemplateMutation.isPending}
			/>

			<InfiniteTable<TemplateRow>
				data={rows}
				columns={[...AUTHORING_SIDEBAR_COLUMNS, actionsColumn]}
				height={`calc(100vh - ${NAVBAR_HEIGHT}px - 180px)`}
				hasMore={false}
				onRowClick={(row) => onSelectTemplate(row.id)}
				checkboxConfig={{
					getRowId: (row) => row.id,
					checkedIds,
					setCheckedIds,
				}}
			/>

			<ConfirmModal
				open={pendingDelete !== null}
				onClose={() => setPendingDelete(null)}
				title="Delete this document?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={deleteTemplateMutation.isPending}
				onConfirm={() => void handleConfirmDelete()}
			>
				<p className="mb-0 text-neutral-700 dark:text-neutral-300">
					<span className="font-medium text-neutral-900 dark:text-neutral-100">
						{pendingDelete?.name ? `"${pendingDelete.name}"` : "This document"}
					</span>{" "}
					will be permanently removed. This cannot be undone.
				</p>
			</ConfirmModal>
		</div>
	);
}

function AuthoringEmptyIllustration() {
	return (
		<svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			{/* Blob background */}
			<ellipse cx="80" cy="82" rx="58" ry="44" className="fill-primary-100 dark:fill-primary-900/40" />
			{/* Back document */}
			<rect x="52" y="38" width="58" height="72" rx="4" className="fill-primary-200 dark:fill-primary-800/60" transform="rotate(-6 52 38)" />
			{/* Front document */}
			<rect x="50" y="34" width="60" height="76" rx="4" fill="white" className="stroke-primary-400 dark:fill-black-800 dark:stroke-primary-500" strokeWidth="1.5" />
			{/* Document lines */}
			<rect x="61" y="50" width="38" height="3.5" rx="1.75" className="fill-primary-300 dark:fill-primary-700" />
			<rect x="61" y="60" width="38" height="3.5" rx="1.75" className="fill-primary-200 dark:fill-primary-800" />
			<rect x="61" y="70" width="38" height="3.5" rx="1.75" className="fill-primary-200 dark:fill-primary-800" />
			<rect x="61" y="80" width="28" height="3.5" rx="1.75" className="fill-primary-200 dark:fill-primary-800" />
			<rect x="61" y="90" width="22" height="3.5" rx="1.75" className="fill-primary-200 dark:fill-primary-800" />
			{/* Plus decorators */}
			<text x="38" y="48" fontSize="12" className="fill-primary-300 dark:fill-primary-600" fontWeight="300">+</text>
			<text x="126" y="68" fontSize="12" className="fill-primary-300 dark:fill-primary-600" fontWeight="300">+</text>
			<text x="42" y="88" fontSize="10" className="fill-primary-200 dark:fill-primary-700" fontWeight="300">+</text>
			<text x="122" y="44" fontSize="8" className="fill-primary-200 dark:fill-primary-700" fontWeight="300">·</text>
			<text x="75" y="28" fontSize="8" className="fill-primary-200 dark:fill-primary-700" fontWeight="300">·</text>
		</svg>
	);
}

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
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const patchFieldValuesMutation = usePatchAgreementFieldValuesMutation();
	const postLineItemMutation = usePostAgreementLineItemMutation();
	const patchLineItemMutation = usePatchAgreementLineItemMutation();
	const deleteMutation = useDeleteAgreementMutation();

	const agreementId = agreementIdParam?.trim() ?? "";
	const agreementIdValid = Boolean(agreementId) && isMongoObjectIdString(agreementId);

	const dashboardQuery = useAgreementDashboardQuery({
		agreementId,
		enabled: agreementIdValid,
	});
	const dashboard: AgreementDashboardData | undefined = dashboardQuery.data;

	const stepsQuery = useAgreementDocumentStepsQuery({
		agreementId,
		enabled: agreementIdValid,
	});
	const steps = stepsQuery.data ?? [];

	const allStepsQuery = useAgreementDocumentStepsQuery({
		agreementId,
		enabled: agreementIdValid,
		hideAuthoringSteps: false,
	});
	const allSteps = allStepsQuery.data ?? [];
	const stepsLoading = stepsQuery.isPending;
	const stepsError = useMemo(() => {
		if (!stepsQuery.error) return null;
		if (!agreementId) return "Missing agreement id.";
		if (!isMongoObjectIdString(agreementId)) return "Invalid agreement id.";
		return formatUserFacingError(stepsQuery.error, "Could not load agreement steps.");
	}, [agreementId, stepsQuery.error]);

	const [activeTabKey, setActiveTabKey] = useState("");
	const prevAgreementIdRef = useRef(agreementId);
	const skipUrlTabSyncRef = useRef(false);
	const [fieldValuesByStepId, setFieldValuesByStepId] = useState<Record<string, Record<string, unknown>>>({});
	const [fieldErrorsById, setFieldErrorsById] = useState<Record<string, string>>({});
	const [lineItemQuery, setLineItemQuery] = useState<string | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [pendingTabKey, setPendingTabKey] = useState<string | null>(null);
	const [previewAttachment, setPreviewAttachment] = useState<AgreementAttachment | null>(null);
	const [previewSidebarWidth, setPreviewSidebarWidth] = useState(RESIZABLE_SIDEBAR_DEFAULT_WIDTH);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [authoringSidebarOpen, setAuthoringSidebarOpen] = useState(false);
	const [authoringSidebarWidth, setAuthoringSidebarWidth] = useState(0);
	const [authoringFullscreen, setAuthoringFullscreen] = useState(false);
	const [newAuthoringTemplateOpen, setNewAuthoringTemplateOpen] = useState(false);
	const [selectedAuthoringTemplateId, setSelectedAuthoringTemplateId] = useState<string | null>(null);
	const [templateEditorWidth, setTemplateEditorWidth] = useState(720);
	const authoringEditorRef = useRef<TemplateEditorSidebarHandle>(null);
	const tabChangeModalTitleId = useId();
	const previewOpen = previewAttachment !== null;

	const openAuthoringSidebar = useCallback(() => {
		setPreviewAttachment(null);
		setAuthoringSidebarOpen(true);
	}, []);

	const handlePreviewAttachmentChange = useCallback((attachment: AgreementAttachment | null) => {
		if (attachment !== null) {
			setAuthoringSidebarOpen(false);
			setAuthoringSidebarWidth(0);
			setSelectedAuthoringTemplateId(null);
			setAuthoringFullscreen(false);
		}
		setPreviewAttachment(attachment);
	}, []);

	const refreshStepDetails = useCallback(() => {
		if (!agreementIdValid) return;
		invalidateAgreementStepDetailsQueries(queryClient, agreementId);
	}, [agreementId, agreementIdValid, queryClient]);

	useEffect(() => {
		if (prevAgreementIdRef.current === agreementId) return;
		prevAgreementIdRef.current = agreementId;
		setFieldValuesByStepId({});
		setLineItemQuery(null);
		setIsEditMode(false);
		setPendingTabKey(null);
		setPreviewAttachment(null);
		setActiveTabKey("");
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete(TAB_QUERY_PARAM);
				return next;
			},
			{ replace: true }
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when agreement id changes
	}, [agreementId]);

	useEffect(() => {
		if (!isEditMode) setPendingTabKey(null);
	}, [isEditMode]);

	useEffect(() => {
		if (!stepsQuery.isError || !stepsQuery.error) return;
		toast.error(formatUserFacingError(stepsQuery.error, "Could not load agreement steps."), {
			toastId: `agreement-details-steps-${agreementId}`,
		});
	}, [agreementId, stepsQuery.error, stepsQuery.isError]);

	const agreementTabs = useMemo(
		() =>
			buildAgreementTabDescriptors(steps, {
				dashboardStep: AGREEMENT_DASHBOARD_TAB,
				teamsStep: AGREEMENT_TEAMS_TAB,
				attachmentsStep: AGREEMENT_ATTACHMENTS_TAB,
			}),
		[steps]
	);

	const setActiveTab = useCallback(
		(key: string) => {
			if (!key) return;
			skipUrlTabSyncRef.current = true;
			setActiveTabKey(key);
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					applyTabToSearchParams(next, key);
					return next;
				},
				{ replace: true }
			);
		},
		[setSearchParams]
	);

	/** Hydrate tab from URL when steps load or when the user navigates with back/forward. */
	useEffect(() => {
		if (agreementTabs.length === 0) return;
		if (skipUrlTabSyncRef.current) {
			skipUrlTabSyncRef.current = false;
			return;
		}
		const urlTab = searchParams.get(TAB_QUERY_PARAM)?.trim() ?? "";
		const resolvedKey = urlTab ? resolveAgreementTabKeyFromUrl(urlTab, agreementTabs) : null;
		if (resolvedKey) {
			setActiveTabKey((prev) => (prev === resolvedKey ? prev : resolvedKey));
			const needsUrlSync =
				resolvedKey === DASHBOARD_TAB_KEY ? urlTab.length > 0 : urlTab !== resolvedKey;
			if (needsUrlSync) {
				setSearchParams(
					(prev) => {
						const next = new URLSearchParams(prev);
						applyTabToSearchParams(next, resolvedKey);
						return next;
					},
					{ replace: true }
				);
			}
			return;
		}
		const fallback = agreementTabs[0]?.key ?? DASHBOARD_TAB_KEY;
		setActiveTabKey((prev) =>
			prev && agreementTabs.some((t) => t.key === prev) ? prev : fallback
		);
		if (urlTab) {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.delete(TAB_QUERY_PARAM);
					return next;
				},
				{ replace: true }
			);
		}
	}, [agreementTabs, searchParams, setSearchParams]);

	const currentStep = useMemo(
		() => agreementTabs.find((t) => t.key === activeTabKey)?.step ?? null,
		[activeTabKey, agreementTabs]
	);
	const stepStorageKey = currentStep?.id ?? "";

	const stepDetailsFetchEnabled =
		agreementIdValid &&
		Boolean(currentStep) &&
		!isAgreementDashboardTab(currentStep) &&
		!isAgreementTeamsTab(currentStep) &&
		!isAgreementAttachmentsTab(currentStep) &&
		!isClausesWizardStepName(currentStep);

	const stepDetailsQuery = useAgreementStepDetailsQuery({
		agreementId,
		step: currentStep,
		lineItemId: lineItemQuery,
		enabled: stepDetailsFetchEnabled,
	});
	const stepDetails = stepDetailsQuery.data ?? null;
	const stepDetailsLoading = stepDetailsQuery.isFetching;
	const stepDetailsError = useMemo(
		() => formatAgreementStepDetailsQueryError(stepDetailsQuery.error),
		[stepDetailsQuery.error]
	);

	useEffect(() => {
		if (!stepDetailsQuery.isError || !stepDetailsQuery.error || !currentStep) return;
		const of = agreementStepDetailsOfQuery(currentStep);
		const lineItemIdParam = normalizeAgreementLineItemIdForQuery(lineItemQuery);
		const message = formatAgreementStepDetailsQueryError(stepDetailsQuery.error);
		if (!message) return;
		toast.error(message, {
			toastId: `agreement-details-tab-${agreementId}-${of}-${lineItemIdParam ?? "list"}`,
		});
	}, [
		agreementId,
		currentStep,
		lineItemQuery,
		stepDetailsQuery.error,
		stepDetailsQuery.isError,
	]);

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
		if (
			isAgreementDashboardTab(currentStep) ||
			isAgreementTeamsTab(currentStep) ||
			isAgreementAttachmentsTab(currentStep)
		) {
			return false;
		}
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
			if (isEditMode && hasUnsavedChanges) {
				setPendingTabKey(nextKey);
				return;
			}
			setActiveTab(nextKey);
		},
		[activeTabKey, hasUnsavedChanges, hideLineItemsWizardNav, isEditMode, setActiveTab]
	);

	const pendingTabLabel = useMemo(() => {
		if (!pendingTabKey) return "";
		return agreementTabs.find((t) => t.key === pendingTabKey)?.step.name?.trim() || "tab";
	}, [agreementTabs, pendingTabKey]);

	const isTabChangeSaving = patchFieldValuesMutation.isPending && pendingTabKey !== null;

	const closeTabChangeModal = useCallback(() => {
		if (!isTabChangeSaving) setPendingTabKey(null);
	}, [isTabChangeSaving]);

	const completePendingTabChange = useCallback(() => {
		if (!pendingTabKey) return;
		setActiveTab(pendingTabKey);
		setPendingTabKey(null);
	}, [pendingTabKey, setActiveTab]);

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
		setLineItemQuery((prev) => {
			const q = prev?.trim();
			if (!q || q.toLowerCase() === "list") return prev;
			return null;
		});
		setPendingTabKey(null);
		discardCurrentStepEdits();
	}, [discardCurrentStepEdits]);

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

	const tabItems: TabItem[] = useMemo(
		() =>
			agreementTabs.map((t) => ({
				key: t.key,
				label: t.step.name?.trim() || "Step",
			})),
		[agreementTabs]
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

	const authoringTemplatesQuery = useTemplatesInfiniteList({
		agreement: agreementId,
		sort: "-createdAt",
		enabled: authoringSidebarOpen && Boolean(agreementId),
	});
	const authoringTemplateRows = useMemo(
		() => authoringTemplatesQuery.data?.pages.flatMap((p) => p.data) ?? [],
		[authoringTemplatesQuery.data]
	);

	const authoringStep = allSteps.find(
		(s) =>
			s.catalogStepName?.trim().toLowerCase() === "authoring" ||
			s.name?.trim().toLowerCase() === "authoring"
	);
	const hasAuthoringStep = Boolean(authoringStep);
	const authoringTabKey = authoringStep?.id ?? "";

	const agreementMenuItems: MenuProps["items"] = [
		...(hasAuthoringStep
			? [
					{
						key: "authoring",
						icon: <DriveFileRenameOutlineOutlinedIcon sx={{ fontSize: 16 }} />,
						label: "Authoring",
					},
				]
			: []),
		{
			key: "delete",
			icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />,
			label: "Delete",
			danger: true,
		},
	];

	const handleDelete = async () => {
		if (!agreementId) return;
		try {
			await deleteMutation.mutateAsync(agreementId);
			toast.success("Agreement deleted.");
			navigate("/agreements");
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete agreement."));
		}
	};

	const authoringLockedCdts: LockedCdts | undefined =
		dashboard?.agreement_category && dashboard?.agreement_domain && dashboard?.agreement_type && dashboard?.agreement_subtype
			? {
					categoryId: dashboard.agreement_category._id,
					categoryName: dashboard.agreement_category.name ?? "",
					domainId: dashboard.agreement_domain._id,
					domainName: dashboard.agreement_domain.name ?? "",
					typeId: dashboard.agreement_type._id,
					typeName: dashboard.agreement_type.name ?? "",
					subtypeId: dashboard.agreement_subtype._id,
					subtypeName: dashboard.agreement_subtype.name ?? "",
			  }
			: undefined;

	const agreementDataQuery = useAgreementDataQuery({
		agreementId,
		enabled: Boolean(selectedAuthoringTemplateId),
	});
	const editorVariables = useMemo<Record<string, string>>(() => {
		const raw = agreementDataQuery.data ?? {};
		const result: Record<string, string> = {};
		for (const [k, v] of Object.entries(raw)) {
			if (v === null || v === undefined || v === "") continue;
			if (typeof v === "boolean") {
				result[k] = v ? "Yes" : "No";
			} else if (typeof v === "number") {
				result[k] = String(v);
			} else {
				result[k] = String(v);
			}
		}
		return result;
	}, [agreementDataQuery.data]);

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
		return <AgreementDetailsPageSkeleton />;
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
		<CardMain
			className="relative flex min-h-0 flex-1 flex-col gap-0 overflow-hidden !m-0 !p-0"
			style={{ minHeight: "unset", height: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}
		>
			<div
				className="flex min-h-0 flex-1 flex-col"
				style={
					previewOpen || authoringSidebarOpen || Boolean(selectedAuthoringTemplateId)
						? {
								paddingRight:
									(previewOpen ? previewSidebarWidth : 0) +
									(authoringSidebarOpen && !selectedAuthoringTemplateId ? authoringSidebarWidth : 0) +
									(selectedAuthoringTemplateId ? templateEditorWidth : 0),
							}
						: undefined
				}
			>
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
			<Card className="flex shrink-0 flex-col gap-4 p-4 overflow-hidden">
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
						<Dropdown
							trigger={["click"]}
							menu={{
								items: agreementMenuItems,
								onClick: ({ key, domEvent }) => {
									domEvent.stopPropagation();
									if (key === "delete") setDeleteConfirmOpen(true);
									if (key === "authoring") openAuthoringSidebar();
								},
							}}
							placement="bottomRight"
						>
							<button
								type="button"
								className="inline-flex items-center justify-center rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-black-700 dark:hover:text-neutral-200"
								onClick={(e) => e.stopPropagation()}
								aria-label="More options"
							>
								<MoreVertOutlinedIcon sx={{ fontSize: 20 }} />
							</button>
						</Dropdown>
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
							) : isAgreementAttachmentsTab(currentStep) ? (
								<AgreementAttachmentsStepPanel
									agreementId={agreementId}
									readOnly={!isEditMode}
									previewAttachmentId={previewAttachment?.id ?? null}
									onPreviewAttachmentChange={handlePreviewAttachmentChange}
								/>
							) : isClausesWizardStepName(currentStep) ? (
								<AgreementClausesStepPanel agreementId={agreementId} readOnly={!isEditMode} />
							) : isLineItemsWizardStepName(currentStep) ? (
								lineItemQuery ? (
									<AgreementLineItemEditorView
										key={`${lineItemQuery}-${stepDetailsQuery.dataUpdatedAt}`}
										details={stepDetails}
										mode={lineItemEditorMode}
										initialValuesByFieldId={lineItemEditorInitialValues}
										readOnly={!isEditMode}
										onCancel={() => setLineItemQuery(null)}
										onSave={(v) => void handleLineItemSave(v)}
										savePending={postLineItemMutation.isPending || patchLineItemMutation.isPending}
									/>
								) : (
									<AgreementLineItemsStepPanel
										agreementId={agreementId}
										details={stepDetails}
										loading={stepDetailsLoading}
										errorMessage={stepDetailsError}
										readOnly={!isEditMode}
										onRefresh={refreshStepDetails}
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
									onAddToDocument={
										selectedAuthoringTemplateId &&
										(currentStep?.name?.trim().toLowerCase() === "header" ||
											currentStep?.catalogStepName?.trim().toLowerCase() === "header")
											? (gtn) => authoringEditorRef.current?.insertVariable(gtn)
											: undefined
									}
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
			</div>

			{previewAttachment && canPreviewAttachment(previewAttachment) ? (
				<ResizableSidebar
					open
					variant="page"
					title={attachmentDisplayName(previewAttachment)}
					onClose={() => setPreviewAttachment(null)}
					onWidthChange={setPreviewSidebarWidth}
					minWidth={RESIZABLE_SIDEBAR_MIN_WIDTH}
					maxWidth={RESIZABLE_SIDEBAR_MAX_WIDTH}
					defaultWidth={RESIZABLE_SIDEBAR_DEFAULT_WIDTH}
				>
					<AgreementAttachmentDocPreview attachment={previewAttachment} />
				</ResizableSidebar>
			) : null}

			{/* Authoring sidebar — fullscreen mode */}
			{authoringSidebarOpen && authoringFullscreen && !selectedAuthoringTemplateId && (
				<div className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-white dark:bg-black-800">
					<AuthoringSidebarHeader
						fullscreen
						onFullscreenToggle={() => setAuthoringFullscreen(false)}
						onClose={() => { setAuthoringSidebarOpen(false); setAuthoringSidebarWidth(0); setAuthoringFullscreen(false); }}
					/>
					<AuthoringSidebarBody
						loading={authoringTemplatesQuery.isPending}
						rows={authoringTemplateRows}
						onNewDocument={() => setNewAuthoringTemplateOpen(true)}
						onSelectTemplate={setSelectedAuthoringTemplateId}
					/>
				</div>
			)}

			{/* Authoring sidebar — resizable mode */}
			<ResizableSidebar
				open={authoringSidebarOpen && !authoringFullscreen && !selectedAuthoringTemplateId}
				variant="page"
				onClose={() => { setAuthoringSidebarOpen(false); setAuthoringSidebarWidth(0); }}
				onWidthChange={setAuthoringSidebarWidth}
				defaultWidth={720}
				minWidth={480}
				maxWidth={1000}
			>
				<AuthoringSidebarHeader
					fullscreen={false}
					onFullscreenToggle={() => setAuthoringFullscreen(true)}
					onClose={() => { setAuthoringSidebarOpen(false); setAuthoringSidebarWidth(0); }}
				/>
				<AuthoringSidebarBody
					loading={authoringTemplatesQuery.isPending}
					rows={authoringTemplateRows}
					onNewDocument={() => setNewAuthoringTemplateOpen(true)}
					onSelectTemplate={setSelectedAuthoringTemplateId}
				/>
			</ResizableSidebar>

			{/* Template editor — replaces authoring list when a template is selected */}
			<TemplateEditorSidebar
				ref={authoringEditorRef}
				templateId={selectedAuthoringTemplateId}
				onClose={() => setSelectedAuthoringTemplateId(null)}
				onWidthChange={setTemplateEditorWidth}
				variables={editorVariables}
			/>

			{/* New template modal — CDTS locked from agreement, agreement id sent in background */}
			<NewTemplateModal
				open={newAuthoringTemplateOpen}
				onClose={() => setNewAuthoringTemplateOpen(false)}
				onCreated={(id) => {
					setNewAuthoringTemplateOpen(false);
					setSelectedAuthoringTemplateId(id);
				}}
				lockedCdts={authoringLockedCdts}
				agreementId={agreementId}
			/>

			<Modal
				open={deleteConfirmOpen}
				onCancel={() => !deleteMutation.isPending && setDeleteConfirmOpen(false)}
				width={440}
				header={
					<h2 className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
						Delete agreement?
					</h2>
				}
				footer={
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							size="md"
							appearance="outlined"
							status="secondary-neutral"
							onClick={() => setDeleteConfirmOpen(false)}
							disabled={deleteMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="md"
							appearance="filled"
							status="primary"
							className="!bg-error-600 !hover:bg-error-700 dark:!bg-error-500"
							loading={deleteMutation.isPending}
							onClick={() => void handleDelete()}
						>
							Delete
						</Button>
					</div>
				}
			>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					This will permanently delete{" "}
					<span className="font-medium text-neutral-900 dark:text-white">
						{headerDisplayName || headerDisplayId || "this agreement"}
					</span>
					. This action cannot be undone.
				</p>
			</Modal>
		</CardMain>
	);
}
