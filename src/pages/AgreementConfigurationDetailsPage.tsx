import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Switch } from "antd";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import {
	ApiError,
	buildAgreementRelevantTeamsPayload,
	resolveAgreementRelevantTeamId,
	isMongoObjectIdString,
	useAgreementCategoriesQuery,
	useAgreementConfigQuery,
	useAgreementDomainsQuery,
	useAgreementStepsQuery,
	useAgreementSubtypesQuery,
	useAgreementTypesQuery,
	useConfigureAgreementConfigMutation,
	usePatchAgreementConfigActivationMutation,
	usePatchAgreementConfigCatalogMutation,
} from "../api";
import type { AgreementConfigApi, AgreementConfiguredStep } from "../api/services/agreementConfigs";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";
import {
	buildConfigureAgreementPayload,
	type ConfigureDraftSection,
	type ConfigureFieldOverrides,
} from "./agreementConfiguration/buildConfigureAgreementPayload";
import { AddFieldsModal } from "./agreementConfiguration/AddFieldsModal";
import { buildAgreementConfigFieldContextLabel } from "../lib/fieldContext";
import { AddRelevantTeamsModal } from "./agreementConfiguration/AddRelevantTeamsModal";
import {
	AgreementRelevantTeamsPanel,
	type AgreementRelevantTeamDraftEntry,
} from "./agreementConfiguration/AgreementRelevantTeamsPanel";
import {
	applyLayoutSectionsToConfigureState,
	orderDisplaySections,
} from "./agreementConfiguration/agreementLayoutDnD";
import {
	AgreementStepLayoutPanel,
	type DisplaySectionRow,
	mergeSectionFieldIds,
} from "./agreementConfiguration/AgreementStepLayoutPanel";
import { Button } from "../components/base/Button";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { Modal } from "../components/base/Modal";
import { AgreementConfigurationPageSkeleton } from "../components/skeletons";
import { FormInput } from "../components/form-input/FormInput";
import { FormMultiSelect } from "../components/form-input/FormMultiSelect";
import { FormSelect } from "../components/form-input/FormSelect";
import { Stepper, type StepperStep } from "../components/base/Stepper";
import { Tabs, type TabItem } from "../components/base/Tabs";
import type { Team } from "../schemas/team";

const EMPTY_CONFIGURE_OVERRIDES: ConfigureFieldOverrides = {
	addedBySectionKey: {},
	removedFieldIdBySectionKey: {},
	sectionNameBySectionKey: {},
};

const AGREEMENT_DETAIL_TAB_KEYS = {
	general: "general",
	configuration: "configuration",
} as const;

type AgreementDetailTabKey = (typeof AGREEMENT_DETAIL_TAB_KEYS)[keyof typeof AGREEMENT_DETAIL_TAB_KEYS];

const GENERAL_SUB_TAB_KEYS = {
	configurationType: "configuration-type",
	additionalSteps: "additional-steps",
	workflow: "workflow",
	relevantTeams: "relevant-teams",
} as const;

type GeneralSubTabKey = (typeof GENERAL_SUB_TAB_KEYS)[keyof typeof GENERAL_SUB_TAB_KEYS];

type CatalogFieldErrors = Partial<{
	category: string;
	domain: string;
	agreementType: string;
	agreementSubtype: string;
}>;

function agreementDetailTabLabel(text: string) {
	return <span className="text-xs font-semibold uppercase tracking-wide">{text}</span>;
}

function statusBadgeClass(isActive: boolean | undefined): string {
	if (isActive) {
		return "rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
	}
	return "rounded-full px-2 py-0.5 text-xs font-medium bg-neutral-200 text-neutral-700 dark:bg-black-600 dark:text-neutral-300";
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

function configuredStepId(step: AgreementConfiguredStep & { step?: string }): string {
	return step.id?.trim() || step.step?.trim() || "";
}

/** Shown under main Configuration tab as sub-tabs; layout is edited elsewhere for these. */
function isAuthoringOrClausesWizardStepName(name: string | undefined): boolean {
	const n = name?.trim().toLowerCase();
	return n === "authoring" || n === "clauses";
}

function resolveConfigurationTabStepId(config: AgreementConfigApi | undefined, storedSubTabKey: string): string {
	if (!config) return "";
	const steps = (config.steps ?? []).filter((s) => !isAuthoringOrClausesWizardStepName(s.name));
	const key = storedSubTabKey.trim();
	if (key && steps.some((s) => s._id === key)) return key;
	return steps[0]?._id ?? "";
}

function isHeaderWizardStepName(name: string | undefined): boolean {
	return name?.trim().toLowerCase() === "header";
}

function headerStepIdFromConfig(config: AgreementConfigApi): string | undefined {
	const step = config.steps?.find((s) => isHeaderWizardStepName(s.name));
	return step?._id?.trim() || undefined;
}

/** Wizard steps for Additional steps UI — Header is implicit and not shown. */
function agreementWizardStepsForAdditionalStepper(config: AgreementConfigApi): StepperStep[] {
	return (config.steps ?? [])
		.filter((s) => !isHeaderWizardStepName(s.name))
		.map((s) => ({
			key: s._id,
			label: s.name?.trim() || "Untitled step",
		}));
}

/** Build config with `steps` replaced by `orderedStepIds` (catalog names for ids not yet on the document). */
function agreementConfigWithStepOrder(
	base: AgreementConfigApi,
	orderedStepIds: string[],
	nameById: Map<string, string>
): AgreementConfigApi {
	const seen = new Set<string>();
	const nextSteps = orderedStepIds
		.filter((sid) => {
			const id = sid?.trim();
			if (!id || seen.has(id)) return false;
			seen.add(id);
			return true;
		})
		.map((stepId) => {
			const existing = base.steps.find((s) => s._id === stepId);
			if (existing) return { ...existing };
			return { _id: stepId, name: nameById.get(stepId)?.trim() || "Step" };
		});
	return { ...base, steps: nextSteps };
}

export const AgreementConfigurationDetailsPage = () => {
	const { id } = useParams<{ id: string }>();
	const configQuery = useAgreementConfigQuery({ id });
	const configForBreadcrumb = configQuery.data;

	const navbarBreadcrumb = useMemo(() => {
		const base = [
			crumb("Configure", "/configure"),
			crumb("Agreements", "/configure/agreements"),
		];
		if (!configForBreadcrumb) return base;
		return [...base, crumb(configForBreadcrumb.displayId?.trim() || configForBreadcrumb._id)];
	}, [configForBreadcrumb]);
	usePageBreadcrumb(navbarBreadcrumb);
	const [detailTab, setDetailTab] = useState<AgreementDetailTabKey>(AGREEMENT_DETAIL_TAB_KEYS.general);
	const [generalSubTab, setGeneralSubTab] = useState<GeneralSubTabKey>(GENERAL_SUB_TAB_KEYS.configurationType);
	/** Wizard step `_id` for Configuration tab sub-tabs (excludes Authoring / Clauses). */
	const [configurationStepSubTabKey, setConfigurationStepSubTabKey] = useState("");
	const [draftSectionsByStepId, setDraftSectionsByStepId] = useState<Record<string, ConfigureDraftSection[]>>({});
	const [layoutFieldOverrides, setLayoutFieldOverrides] = useState<ConfigureFieldOverrides>({
		...EMPTY_CONFIGURE_OVERRIDES,
	});
	const [addLayoutSectionOpen, setAddLayoutSectionOpen] = useState(false);
	const [newLayoutSectionName, setNewLayoutSectionName] = useState("");
	const [newLayoutSectionError, setNewLayoutSectionError] = useState<string>();
	const [addLayoutFieldModalOpen, setAddLayoutFieldModalOpen] = useState(false);
	const [addLayoutFieldSectionKey, setAddLayoutFieldSectionKey] = useState<string | null>(null);
	const [headerEditMode, setHeaderEditMode] = useState(false);
	const [draftAdditionalStepIds, setDraftAdditionalStepIds] = useState<string[]>([]);
	const [additionalStepsFieldError, setAdditionalStepsFieldError] = useState<string>();
	const [draftCategoryId, setDraftCategoryId] = useState("");
	const [draftDomainId, setDraftDomainId] = useState("");
	const [draftAgreementTypeId, setDraftAgreementTypeId] = useState("");
	const [draftAgreementSubtypeId, setDraftAgreementSubtypeId] = useState("");
	const [catalogFieldErrors, setCatalogFieldErrors] = useState<CatalogFieldErrors>({});
	const [relevantTeamsDraft, setRelevantTeamsDraft] = useState<
		Record<string, AgreementRelevantTeamDraftEntry>
	>({});
	const [relevantTeamIds, setRelevantTeamIds] = useState<string[]>([]);
	const [addRelevantTeamsModalOpen, setAddRelevantTeamsModalOpen] = useState(false);
	const [addRelevantTeamsPending, setAddRelevantTeamsPending] = useState(false);

	const configureMutation = useConfigureAgreementConfigMutation();
	const patchCatalogMutation = usePatchAgreementConfigCatalogMutation();
	const activateMutation = usePatchAgreementConfigActivationMutation();
	const agreementStepsCatalogQuery = useAgreementStepsQuery({
		enabled:
			Boolean(id?.trim()) &&
			headerEditMode &&
			detailTab === AGREEMENT_DETAIL_TAB_KEYS.general,
	});

	const catalogQueriesEnabled =
		Boolean(id?.trim()) &&
		detailTab === AGREEMENT_DETAIL_TAB_KEYS.general &&
		generalSubTab === GENERAL_SUB_TAB_KEYS.configurationType;
	const categoriesQuery = useAgreementCategoriesQuery({ enabled: catalogQueriesEnabled });
	const domainsQuery = useAgreementDomainsQuery({
		agreementCategoryId: draftCategoryId,
		enabled: catalogQueriesEnabled && isMongoObjectIdString(draftCategoryId),
	});
	const typesQuery = useAgreementTypesQuery({
		agreementDomainId: draftDomainId,
		enabled: catalogQueriesEnabled && isMongoObjectIdString(draftDomainId),
	});
	const subtypesQuery = useAgreementSubtypesQuery({
		agreementTypeId: draftAgreementTypeId,
		enabled: catalogQueriesEnabled && isMongoObjectIdString(draftAgreementTypeId),
	});

	useEffect(() => {
		setDetailTab(AGREEMENT_DETAIL_TAB_KEYS.general);
		setGeneralSubTab(GENERAL_SUB_TAB_KEYS.configurationType);
		setHeaderEditMode(false);
		setDraftAdditionalStepIds([]);
		setAdditionalStepsFieldError(undefined);
		setDraftCategoryId("");
		setDraftDomainId("");
		setDraftAgreementTypeId("");
		setDraftAgreementSubtypeId("");
		setCatalogFieldErrors({});
		setConfigurationStepSubTabKey("");
		setDraftSectionsByStepId({});
		setLayoutFieldOverrides({ ...EMPTY_CONFIGURE_OVERRIDES });
		setAddLayoutSectionOpen(false);
		setNewLayoutSectionName("");
		setNewLayoutSectionError(undefined);
		setAddLayoutFieldModalOpen(false);
		setAddLayoutFieldSectionKey(null);
		setRelevantTeamsDraft({});
		setRelevantTeamIds([]);
	}, [id]);

	useEffect(() => {
		setAddLayoutSectionOpen(false);
		setAddLayoutFieldModalOpen(false);
		setAddLayoutFieldSectionKey(null);
	}, [configurationStepSubTabKey, detailTab, id]);

	useEffect(() => {
		const cfg = configQuery.data;
		const rid = id?.trim();
		if (!cfg || cfg._id !== rid) return;
		setRelevantTeamIds(
			(cfg.relevantTeams ?? [])
				.map((r) => resolveAgreementRelevantTeamId(r.team))
				.filter((tid) => tid.length > 0)
		);
	}, [configQuery.data, id]);

	const detailTabItems: TabItem[] = useMemo(
		() => [
			{
				key: AGREEMENT_DETAIL_TAB_KEYS.general,
				label: (
					<span className="inline-flex items-center gap-1">
						{agreementDetailTabLabel("General")}
					</span>
				),
			},
			{
				key: AGREEMENT_DETAIL_TAB_KEYS.configuration,
				label: agreementDetailTabLabel("Configuration"),
			},
		],
		[]
	);

	useEffect(() => {
		if (!configQuery.isError || !configQuery.error) return;
		const err = configQuery.error;
		const message =
			err instanceof ApiError && err.status === 404
				? "Agreement config not found."
				: formatUserFacingError(err, "Could not load agreement configuration.");
		toast.error(message, { toastId: `agreement-detail-${id ?? "unknown"}` });
	}, [configQuery.isError, configQuery.error, id]);

	const additionalStepSelectOptions = useMemo(() => {
		const rows = agreementStepsCatalogQuery.data?.data ?? [];
		const map = new Map(
			rows
				.filter((r) => !isHeaderWizardStepName(r.name))
				.map((r) => [r._id, { label: r.name, value: r._id }])
		);
		const cfg = configQuery.data;
		for (const s of cfg?.steps ?? []) {
			if (isHeaderWizardStepName(s.name)) continue;
			if (!map.has(s._id)) map.set(s._id, { label: s.name?.trim() || s._id, value: s._id });
		}
		return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
	}, [agreementStepsCatalogQuery.data, configQuery.data]);

	const categorySelectOptions = useMemo(
		() => categoriesQuery.data?.data.map((c) => ({ value: c._id, label: c.name })) ?? [],
		[categoriesQuery.data]
	);
	const domainSelectOptions = useMemo(
		() => domainsQuery.data?.data.map((d) => ({ value: d._id, label: d.name })) ?? [],
		[domainsQuery.data]
	);
	const typeSelectOptions = useMemo(
		() => typesQuery.data?.data.map((t) => ({ value: t._id, label: t.name })) ?? [],
		[typesQuery.data]
	);
	const subtypeSelectOptions = useMemo(
		() => subtypesQuery.data?.data.map((s) => ({ value: s._id, label: s.name })) ?? [],
		[subtypesQuery.data]
	);

	const clearConfigurationLayoutDrafts = useCallback(() => {
		setDraftSectionsByStepId({});
		setLayoutFieldOverrides({ ...EMPTY_CONFIGURE_OVERRIDES });
		setAddLayoutSectionOpen(false);
		setNewLayoutSectionName("");
		setNewLayoutSectionError(undefined);
		setAddLayoutFieldModalOpen(false);
		setAddLayoutFieldSectionKey(null);
	}, []);

	const persistAgreementRelevantTeamsConfigure = useCallback(
		async (opts?: {
			nextTeamIds?: string[];
			nextDraft?: Record<string, AgreementRelevantTeamDraftEntry>;
		}) => {
			const cfg = configQuery.data;
			const rid = id?.trim();
			if (!rid || !cfg) return;
			const teamIds = opts?.nextTeamIds ?? relevantTeamIds;
			const draft = opts?.nextDraft ?? relevantTeamsDraft;
			const hid = headerStepIdFromConfig(cfg);
			const orderedStepIds = hid
				? [hid, ...draftAdditionalStepIds.filter((stepId) => stepId !== hid)]
				: [...draftAdditionalStepIds];
			const cat = agreementStepsCatalogQuery.data?.data ?? [];
			const nameById = new Map(cat.map((s) => [s._id, s.name]));
			for (const s of cfg.steps) nameById.set(s._id, s.name);
			const merged = agreementConfigWithStepOrder(cfg, orderedStepIds, nameById);
			const steps = buildConfigureAgreementPayload(merged, {}, EMPTY_CONFIGURE_OVERRIDES).steps ?? [];
			await configureMutation.mutateAsync({
				id: rid,
				body: {
					steps,
					relevantTeams: buildAgreementRelevantTeamsPayload(cfg, draft, teamIds),
				},
			});
			setRelevantTeamsDraft({});
		},
		[
			agreementStepsCatalogQuery.data,
			configQuery.data,
			configureMutation,
			draftAdditionalStepIds,
			id,
			relevantTeamIds,
			relevantTeamsDraft,
		]
	);

	const handleCancelHeaderEdit = useCallback(() => {
		const cfg = configQuery.data;
		setHeaderEditMode(false);
		setAdditionalStepsFieldError(undefined);
		setCatalogFieldErrors({});
		setRelevantTeamsDraft({});
		clearConfigurationLayoutDrafts();
		if (cfg) {
			setDraftAdditionalStepIds(cfg.steps.map((s) => s._id));
			setDraftCategoryId(cfg.agreement_category._id);
			setDraftDomainId(cfg.agreement_domain._id);
			setDraftAgreementTypeId(cfg.agreement_type._id);
			setDraftAgreementSubtypeId(cfg.agreement_subtype._id);
			setRelevantTeamIds(
				(cfg.relevantTeams ?? [])
					.map((r) => resolveAgreementRelevantTeamId(r.team))
					.filter((tid) => tid.length > 0)
			);
		}
	}, [clearConfigurationLayoutDrafts, configQuery.data]);

	const handleSaveAdditionalSteps = useCallback(async () => {
		const cfg = configQuery.data;
		const rid = id?.trim();
		if (!rid || !cfg) return;
		const hid = headerStepIdFromConfig(cfg);
		const orderedIds = hid
			? [hid, ...draftAdditionalStepIds.filter((stepId) => stepId !== hid)]
			: [...draftAdditionalStepIds];
		if (orderedIds.length === 0) {
			setAdditionalStepsFieldError("Add at least one step.");
			return;
		}
		const cat = agreementStepsCatalogQuery.data?.data ?? [];
		const nameById = new Map(cat.map((s) => [s._id, s.name]));
		for (const s of cfg.steps) nameById.set(s._id, s.name);
		try {
			const merged = agreementConfigWithStepOrder(cfg, orderedIds, nameById);
			const body = buildConfigureAgreementPayload(merged, {}, EMPTY_CONFIGURE_OVERRIDES);
			await configureMutation.mutateAsync({
				id: rid,
				body: {
					...body,
					relevantTeams: buildAgreementRelevantTeamsPayload(cfg, relevantTeamsDraft, relevantTeamIds),
				},
			});
			toast.success("Steps updated.");
			setHeaderEditMode(false);
			setAdditionalStepsFieldError(undefined);
			setRelevantTeamsDraft({});
			clearConfigurationLayoutDrafts();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not save steps."));
		}
	}, [
		agreementStepsCatalogQuery.data,
		clearConfigurationLayoutDrafts,
		configQuery.data,
		configureMutation,
		draftAdditionalStepIds,
		id,
		relevantTeamIds,
		relevantTeamsDraft,
	]);

	const enterHeaderEditMode = useCallback(() => {
		const cfg = configQuery.data;
		if (!cfg) return;
		setRelevantTeamsDraft({});
		setDraftCategoryId(cfg.agreement_category._id);
		setDraftDomainId(cfg.agreement_domain._id);
		setDraftAgreementTypeId(cfg.agreement_type._id);
		setDraftAgreementSubtypeId(cfg.agreement_subtype._id);
		setDraftAdditionalStepIds(cfg.steps.map((s) => s._id));
		setAdditionalStepsFieldError(undefined);
		setCatalogFieldErrors({});
		clearConfigurationLayoutDrafts();
		setHeaderEditMode(true);
	}, [clearConfigurationLayoutDrafts, configQuery.data]);

	const handleSaveCatalog = useCallback(async () => {
		const cfg = configQuery.data;
		const rid = id?.trim();
		if (!rid || !cfg) return;
		const e: CatalogFieldErrors = {};
		if (!draftCategoryId.trim()) e.category = "Category is required";
		if (!draftDomainId.trim()) e.domain = "Domain is required";
		if (!draftAgreementTypeId.trim()) e.agreementType = "Agreement type is required";
		if (!draftAgreementSubtypeId.trim()) e.agreementSubtype = "Agreement subtype is required";
		setCatalogFieldErrors(e);
		if (Object.keys(e).length > 0) return;
		const hid = headerStepIdFromConfig(cfg);
		const orderedIds = hid
			? [hid, ...draftAdditionalStepIds.filter((stepId) => stepId !== hid)]
			: [...draftAdditionalStepIds];
		const cat = agreementStepsCatalogQuery.data?.data ?? [];
		const nameById = new Map(cat.map((s) => [s._id, s.name]));
		for (const s of cfg.steps) nameById.set(s._id, s.name);
		const merged = agreementConfigWithStepOrder(cfg, orderedIds, nameById);
		const steps = buildConfigureAgreementPayload(merged, {}, EMPTY_CONFIGURE_OVERRIDES).steps ?? [];
		try {
			await patchCatalogMutation.mutateAsync({
				id: rid,
				body: {
					agreement_category: draftCategoryId.trim(),
					agreement_domain: draftDomainId.trim(),
					agreement_type: draftAgreementTypeId.trim(),
					agreement_subtype: draftAgreementSubtypeId.trim(),
					steps,
					relevantTeams: buildAgreementRelevantTeamsPayload(cfg, relevantTeamsDraft, relevantTeamIds),
				},
			});
			toast.success("Configuration updated.");
			setHeaderEditMode(false);
			setCatalogFieldErrors({});
			setRelevantTeamsDraft({});
			clearConfigurationLayoutDrafts();
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not save configuration."));
		}
	}, [
		agreementStepsCatalogQuery.data,
		clearConfigurationLayoutDrafts,
		configQuery.data,
		draftAdditionalStepIds,
		draftAgreementSubtypeId,
		draftAgreementTypeId,
		draftCategoryId,
		draftDomainId,
		id,
		patchCatalogMutation,
		relevantTeamIds,
		relevantTeamsDraft,
	]);

	const handleConfirmAddRelevantTeams = useCallback(
		async (teams: Team[]) => {
			const cfg = configQuery.data;
			const rid = id?.trim();
			if (!cfg || !rid || teams.length === 0) return;
			const newIds = teams.map((t) => t.id.trim()).filter(Boolean);
			const merged = [...new Set([...relevantTeamIds, ...newIds])];
			const byId = new Map<string, string>();
			for (const t of teams) {
				const tid = t.id.trim();
				if (!tid) continue;
				byId.set(tid, t.description.trim());
			}
			const relevantTeams = buildAgreementRelevantTeamsPayload(cfg, relevantTeamsDraft, merged).map((row) => {
				const nextDescription = byId.get(resolveAgreementRelevantTeamId(row.team));
				return nextDescription !== undefined ? { ...row, description: nextDescription } : row;
			});
			setAddRelevantTeamsPending(true);
			try {
				await configureMutation.mutateAsync({
					id: rid,
					body: {
						relevantTeams,
					},
				});
				setRelevantTeamIds(merged);
				setRelevantTeamsDraft({});
				toast.success(teams.length === 1 ? "Team added." : "Teams added.");
				setAddRelevantTeamsModalOpen(false);
			} catch (e) {
				toast.error(formatUserFacingError(e, "Could not add teams."));
			} finally {
				setAddRelevantTeamsPending(false);
			}
		},
		[configQuery.data, configureMutation, id, relevantTeamIds, relevantTeamsDraft]
	);

	const handleRemoveRelevantTeam = useCallback(
		async (teamId: string) => {
			const tid = teamId.trim();
			if (!tid) return;
			const next = relevantTeamIds.filter((x) => x !== tid);
			try {
				await persistAgreementRelevantTeamsConfigure({ nextTeamIds: next });
				toast.success("Team removed from relevant teams.");
			} catch (e) {
				toast.error(formatUserFacingError(e, "Could not remove team."));
			}
		},
		[persistAgreementRelevantTeamsConfigure, relevantTeamIds]
	);

	const handleRelevantTeamSettingsPatch = useCallback(
		async (teamId: string, patch: Partial<AgreementRelevantTeamDraftEntry>) => {
			const cfg = configQuery.data;
			const fromApi = cfg?.relevantTeams?.find((r) => resolveAgreementRelevantTeamId(r.team) === teamId);
			const base = relevantTeamsDraft[teamId] ?? {
				addAllMembers: fromApi?.addAllMembers ?? false,
				canCreate: fromApi?.canCreate ?? false,
			};
			const nextDraft = { ...relevantTeamsDraft, [teamId]: { ...base, ...patch } };
			setRelevantTeamsDraft(nextDraft);
			try {
				await persistAgreementRelevantTeamsConfigure({ nextDraft });
			} catch (e) {
				toast.error(formatUserFacingError(e, "Could not update team settings."));
			}
		},
		[configQuery.data?.relevantTeams, persistAgreementRelevantTeamsConfigure, relevantTeamsDraft]
	);

	const handleActivate = useCallback(async () => {
		const rid = id?.trim();
		if (!rid) return;
		try {
			await activateMutation.mutateAsync({ id: rid, isActive: true });
			toast.success("Agreement configuration activated.");
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not activate agreement configuration."));
		}
	}, [activateMutation, id]);

	const handleOpenLayoutAddSection = useCallback(() => {
		setNewLayoutSectionName("");
		setNewLayoutSectionError(undefined);
		setAddLayoutSectionOpen(true);
	}, []);

	const handleCloseLayoutAddSection = useCallback(() => {
		setAddLayoutSectionOpen(false);
		setNewLayoutSectionName("");
		setNewLayoutSectionError(undefined);
	}, []);

	const handleSubmitLayoutAddSection = useCallback(() => {
		const cfg = configQuery.data;
		const stepId = resolveConfigurationTabStepId(cfg, configurationStepSubTabKey);
		if (!stepId) {
			handleCloseLayoutAddSection();
			return;
		}
		const trimmed = newLayoutSectionName.trim();
		if (!trimmed) {
			setNewLayoutSectionError("Section name is required");
			return;
		}
		const newId = crypto.randomUUID();
		setDraftSectionsByStepId((prev) => ({
			...prev,
			[stepId]: [...(prev[stepId] ?? []), { id: newId, name: trimmed, fields: [] }],
		}));
		handleCloseLayoutAddSection();
	}, [configurationStepSubTabKey, configQuery.data, handleCloseLayoutAddSection, newLayoutSectionName]);

	const handleOpenLayoutAddField = useCallback((sectionKey: string) => {
		setAddLayoutFieldSectionKey(sectionKey);
		setAddLayoutFieldModalOpen(true);
	}, []);

	const handleCloseLayoutAddFieldModal = useCallback(() => {
		setAddLayoutFieldModalOpen(false);
		setAddLayoutFieldSectionKey(null);
	}, []);

	const handleConfirmLayoutAddFields = useCallback((fieldIds: string[], sectionKey: string) => {
		setLayoutFieldOverrides((p) => ({
			...p,
			addedBySectionKey: {
				...p.addedBySectionKey,
				[sectionKey]: [...new Set([...(p.addedBySectionKey[sectionKey] ?? []), ...fieldIds])],
			},
		}));
	}, []);

	const handleRemoveLayoutFieldFromSection = useCallback((sectionKey: string, fieldId: string) => {
		setLayoutFieldOverrides((p) => {
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

	const handleRenameLayoutSection = useCallback((sectionKey: string, name: string) => {
		setLayoutFieldOverrides((p) => ({
			...p,
			sectionNameBySectionKey: {
				...(p.sectionNameBySectionKey ?? {}),
				[sectionKey]: name.trim(),
			},
		}));
	}, []);

	const handleLayoutSectionsChange = useCallback(
		(sections: DisplaySectionRow[], baseRows: DisplaySectionRow[], stepId: string) => {
			applyLayoutSectionsToConfigureState(
				stepId,
				baseRows,
				sections,
				setDraftSectionsByStepId,
				setLayoutFieldOverrides
			);
		},
		[]
	);

	const handleSaveConfigurationLayout = useCallback(async () => {
		const cfg = configQuery.data;
		const rid = id?.trim();
		if (!rid || !cfg) return;
		try {
			const body = buildConfigureAgreementPayload(cfg, draftSectionsByStepId, layoutFieldOverrides);
			await configureMutation.mutateAsync({ id: rid, body });
			toast.success("Layout saved.");
			clearConfigurationLayoutDrafts();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not save layout."));
		}
	}, [
		clearConfigurationLayoutDrafts,
		configQuery.data,
		configureMutation,
		draftSectionsByStepId,
		id,
		layoutFieldOverrides,
	]);

	const excludeLayoutFieldIdsForModal = useMemo(() => {
		if (!addLayoutFieldSectionKey) return [];
		const cfg = configQuery.data;
		if (!cfg) return [];
		const stepId = resolveConfigurationTabStepId(cfg, configurationStepSubTabKey);
		const configured =
			cfg.configuredSteps?.filter((s): s is AgreementConfiguredStep => Boolean(s)) ?? [];
		const layout = configured.find((c) => configuredStepId(c) === stepId);
		const apiSections = layout?.sections ?? [];
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
		const displaySections = [...apiRows, ...draftRows];
		const sec = displaySections.find((s) => s.key === addLayoutFieldSectionKey);
		const merged = sec
			? {
					...sec,
					name: layoutFieldOverrides.sectionNameBySectionKey?.[sec.key] ?? sec.name,
					fields: mergeSectionFieldIds(sec, layoutFieldOverrides),
				}
			: undefined;
		return merged?.fields ?? [];
	}, [
		addLayoutFieldSectionKey,
		configQuery.data,
		configurationStepSubTabKey,
		draftSectionsByStepId,
		layoutFieldOverrides,
	]);

	if (!id?.trim()) {
		return (
			<CardMain>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">Missing agreement id.</p>
			</CardMain>
		);
	}

	if (configQuery.isPending) {
		return <AgreementConfigurationPageSkeleton />;
	}

	const config = configQuery.data;
	if (!config) {
		return (
			<CardMain>
				<p className="text-sm text-neutral-500 dark:text-neutral-400">No agreement data.</p>
			</CardMain>
		);
	}

	const headerId = config.displayId?.trim() || config._id;
	const breadcrumb = buildBreadcrumb(config);
	const isActive = config.isActive === true;
	const configuredSteps =
		config.configuredSteps?.filter((s): s is AgreementConfiguredStep => Boolean(s)) ?? [];

	const pinnedHeaderWizardStepId = headerStepIdFromConfig(config);
	const wizardAdditionalStepsForStepper = agreementWizardStepsForAdditionalStepper(config);

	const configurationTabWizardSteps = (config.steps ?? []).filter(
		(s) => !isAuthoringOrClausesWizardStepName(s.name)
	);
	const activeConfigurationStepKey = resolveConfigurationTabStepId(config, configurationStepSubTabKey);
	const layoutForActiveConfigurationStep = configuredSteps.find(
		(cs) => configuredStepId(cs) === activeConfigurationStepKey
	);
	const displaySectionsForConfigurationTab = (() => {
		if (!activeConfigurationStepKey) return [];
		const apiSections = layoutForActiveConfigurationStep?.sections ?? [];
		const apiRows = apiSections.map((s, i) => ({
			key: `api-${activeConfigurationStepKey}-${i}`,
			name: s.name,
			fields: [...(s.fields ?? [])],
		}));
		const drafts = draftSectionsByStepId[activeConfigurationStepKey] ?? [];
		const draftRows = drafts.map((d) => ({
			key: `draft-${d.id}`,
			name: d.name,
			fields: [...d.fields],
		}));
		return [...apiRows, ...draftRows];
	})();
	const orderedDisplaySectionsForConfigurationTab = orderDisplaySections(
		displaySectionsForConfigurationTab,
		activeConfigurationStepKey,
		layoutFieldOverrides
	);
	const panelSectionsForConfigurationTab = orderedDisplaySectionsForConfigurationTab.map((s) => ({
		...s,
		name: layoutFieldOverrides.sectionNameBySectionKey?.[s.key] ?? s.name,
		fields: mergeSectionFieldIds(s, layoutFieldOverrides),
	}));
	const configurationSubTabItems: TabItem[] = configurationTabWizardSteps.map((s) => ({
		key: s._id,
		label: s.name?.trim() || "Untitled step",
	}));
	const addLayoutSectionTitleId = "add-agreement-layout-section-modal-title";

	return (
		<>
		<CardMain className="flex min-w-0 flex-col gap-0 overflow-x-hidden !p-0">
			<div className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-black-600 dark:bg-black-800">
				<div className="flex flex-col gap-4 border-b border-neutral-200 px-5 pb-5 pt-5 dark:border-black-600 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-6 sm:pb-6 sm:pt-6">
					<div className="flex min-w-0 flex-1 gap-4">
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/35">
							<DescriptionOutlinedIcon sx={{ fontSize: 24 }} className="text-neutral-600 dark:text-neutral-400" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2 gap-y-1.5">
								<h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
									{headerId}
								</h1>
								<span className={statusBadgeClass(isActive)}>{isActive ? "Active" : "Draft"}</span>
							</div>
							<p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{breadcrumb}</p>
						</div>
					</div>

					<div className="flex shrink-0 items-center gap-3 sm:pt-1">
						<div className="flex items-center gap-2.5">
							<Switch
								size="small"
								checked={headerEditMode}
								onChange={(checked) => {
									if (checked) {
										enterHeaderEditMode();
									} else {
										handleCancelHeaderEdit();
									}
								}}
							/>
							<span className="text-sm text-neutral-600 dark:text-neutral-400">Edit</span>
						</div>
						{!isActive && (
							<Button
								type="button"
								size="sm"
								disabled={headerEditMode}
								onClick={() => void handleActivate()}
								loading={activateMutation.isPending}
							>
								Activate
							</Button>
						)}
					</div>
				</div>

				<div className="border-b border-neutral-200 p-4 dark:border-black-600">
					<Tabs
						items={detailTabItems}
						activeKey={detailTab}
						onChange={(key) => setDetailTab(key as AgreementDetailTabKey)}
						variant="pill"
						size="sm"
						underlineActiveClassName="text-primary-600 dark:text-primary-400"
						underlineInactiveClassName="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-300"
						underlineIndicatorClassName="bg-primary-500 dark:bg-primary-400"
					/>
				</div>
			</div>

			<div className="min-w-0 p-4">
				<Card className="overflow-hidden border border-neutral-200 bg-white p-0 shadow-sm dark:border-black-600 dark:bg-black-800">
				<div className="min-w-0 p-2">
					{detailTab === AGREEMENT_DETAIL_TAB_KEYS.general ? (
						<div className="max-w-full">
							<div className="flex flex-col gap-3 border-b border-neutral-200 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4 dark:border-black-600">
								<div className="min-w-0 flex-1">
									<Tabs
										items={[
											{ key: GENERAL_SUB_TAB_KEYS.configurationType, label: "Configuration type" },
											{ key: GENERAL_SUB_TAB_KEYS.additionalSteps, label: "Additional steps" },
											{ key: GENERAL_SUB_TAB_KEYS.workflow, label: "Workflow" },
											{ key: GENERAL_SUB_TAB_KEYS.relevantTeams, label: "Relevant teams" },
										]}
										activeKey={generalSubTab}
										onChange={(key) => setGeneralSubTab(key as GeneralSubTabKey)}
										variant="underline"
										size="sm"
										className="w-full min-w-0"
										underlineActiveClassName="text-primary-600 dark:text-primary-400"
										underlineInactiveClassName="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-300"
										underlineIndicatorClassName="bg-primary-500 dark:bg-primary-400"
									/>
								</div>
								{headerEditMode && generalSubTab === GENERAL_SUB_TAB_KEYS.relevantTeams ? (
									<div className="flex shrink-0 items-center justify-end gap-2 sm:pb-0.5">
										<Button
											type="button"
											size="sm"
											onClick={() => setAddRelevantTeamsModalOpen(true)}
											disabled={configureMutation.isPending || patchCatalogMutation.isPending}
										>
											<AddOutlinedIcon sx={{ fontSize: 16 }} className="-ml-0.5 mr-0.5" />
											Add team
										</Button>
									</div>
								) : headerEditMode &&
								  (generalSubTab === GENERAL_SUB_TAB_KEYS.configurationType ||
										generalSubTab === GENERAL_SUB_TAB_KEYS.additionalSteps) ? (
									<div className="flex shrink-0 items-center justify-end gap-2 sm:pb-0.5">
										<Button
											type="button"
											size="sm"
											appearance="outlined"
											status="secondary-neutral"
											onClick={handleCancelHeaderEdit}
											disabled={configureMutation.isPending || patchCatalogMutation.isPending}
										>
											Cancel
										</Button>
										{generalSubTab === GENERAL_SUB_TAB_KEYS.configurationType ? (
											<Button
												type="button"
												size="sm"
												onClick={() => void handleSaveCatalog()}
												loading={patchCatalogMutation.isPending}
											>
												Save changes
											</Button>
										) : (
											<Button
												type="button"
												size="sm"
												onClick={() => void handleSaveAdditionalSteps()}
												loading={configureMutation.isPending}
											>
												Save changes
											</Button>
										)}
									</div>
								) : null}
							</div>

							{generalSubTab === GENERAL_SUB_TAB_KEYS.configurationType ? (
								<div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 py-6 shadow-sm sm:px-6 dark:border-black-600 dark:bg-black-800 dark:shadow-none">
									{headerEditMode ? (
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
											<FormSelect
												label="Category"
												required
												error={catalogFieldErrors.category}
												loading={categoriesQuery.isPending}
												options={categorySelectOptions}
												value={draftCategoryId || undefined}
												onChange={(v) => {
													const next = String(v ?? "");
													setDraftCategoryId(next);
													setDraftDomainId("");
													setDraftAgreementTypeId("");
													setDraftAgreementSubtypeId("");
													setCatalogFieldErrors((prev) => ({ ...prev, category: undefined }));
												}}
												showSearch
												optionFilterProp="label"
												placeholder="Select category"
											/>
											<FormSelect
												label="Domain"
												required
												error={catalogFieldErrors.domain}
												loading={domainsQuery.isPending}
												disabled={!isMongoObjectIdString(draftCategoryId)}
												options={domainSelectOptions}
												value={draftDomainId || undefined}
												onChange={(v) => {
													const next = String(v ?? "");
													setDraftDomainId(next);
													setDraftAgreementTypeId("");
													setDraftAgreementSubtypeId("");
													setCatalogFieldErrors((prev) => ({ ...prev, domain: undefined }));
												}}
												showSearch
												optionFilterProp="label"
												placeholder="Select domain"
											/>
											<FormSelect
												label="Agreement Type"
												required
												error={catalogFieldErrors.agreementType}
												loading={typesQuery.isPending}
												disabled={!isMongoObjectIdString(draftDomainId)}
												options={typeSelectOptions}
												value={draftAgreementTypeId || undefined}
												onChange={(v) => {
													const next = String(v ?? "");
													setDraftAgreementTypeId(next);
													setDraftAgreementSubtypeId("");
													setCatalogFieldErrors((prev) => ({ ...prev, agreementType: undefined }));
												}}
												showSearch
												optionFilterProp="label"
												placeholder="Select type"
											/>
											<FormSelect
												label="Agreement Subtype"
												required
												error={catalogFieldErrors.agreementSubtype}
												loading={subtypesQuery.isPending}
												disabled={!isMongoObjectIdString(draftAgreementTypeId)}
												options={subtypeSelectOptions}
												value={draftAgreementSubtypeId || undefined}
												onChange={(v) => {
													setDraftAgreementSubtypeId(String(v ?? ""));
													setCatalogFieldErrors((prev) => ({ ...prev, agreementSubtype: undefined }));
												}}
												showSearch
												optionFilterProp="label"
												placeholder="Select subtype"
											/>
										</div>
									) : (
										<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
											<div className="min-w-0">
												<div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
													Category
												</div>
												<div className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
													{config.agreement_category?.name ?? "—"}
												</div>
											</div>
											<div className="min-w-0">
												<div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
													Domain
												</div>
												<div className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
													{config.agreement_domain?.name ?? "—"}
												</div>
											</div>
											<div className="min-w-0">
												<div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
													Agreement Type
												</div>
												<div className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
													{config.agreement_type?.name ?? "—"}
												</div>
											</div>
											<div className="min-w-0">
												<div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
													Agreement Subtype
												</div>
												<div className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
													{config.agreement_subtype?.name ?? "—"}
												</div>
											</div>
										</div>
									)}
								</div>
							) : null}

							{generalSubTab === GENERAL_SUB_TAB_KEYS.additionalSteps ? (
								<div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-black-600 dark:bg-black-800 dark:shadow-none">
									<div className="overflow-x-auto px-4 py-6 sm:px-6">
										{headerEditMode ? (
											<FormMultiSelect
												className="w-full max-w-3xl"
												label="Add Step"
												required
												error={additionalStepsFieldError}
												loading={agreementStepsCatalogQuery.isPending}
												showSearch
												optionFilterProp="label"
												options={additionalStepSelectOptions}
												value={
													pinnedHeaderWizardStepId
														? draftAdditionalStepIds.filter((stepId) => stepId !== pinnedHeaderWizardStepId)
														: draftAdditionalStepIds
												}
												onChange={(next) => {
													const raw = next as string[];
													setDraftAdditionalStepIds(
														pinnedHeaderWizardStepId
															? [
																	pinnedHeaderWizardStepId,
																	...raw.filter((stepId) => stepId !== pinnedHeaderWizardStepId),
																]
															: raw
													);
													setAdditionalStepsFieldError(undefined);
												}}
												suffixIcon={<SearchOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-400" />}
											/>
										) : wizardAdditionalStepsForStepper.length > 0 ? (
											<Stepper
												steps={wizardAdditionalStepsForStepper}
												activeStep={wizardAdditionalStepsForStepper.length}
												className="min-w-max"
											/>
										) : (
											<p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
												{pinnedHeaderWizardStepId
													? "No additional wizard steps. Header is always included and cannot be removed."
													: "No wizard steps are defined for this configuration."}
											</p>
										)}
									</div>
								</div>
							) : null}

							{generalSubTab === GENERAL_SUB_TAB_KEYS.workflow ? (
								<div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 py-8 shadow-sm sm:px-6 dark:border-black-600 dark:bg-black-800 dark:shadow-none">
									<p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
										Workflow settings are not available yet.
									</p>
								</div>
							) : null}

							{generalSubTab === GENERAL_SUB_TAB_KEYS.relevantTeams ? (
								<div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 py-6 shadow-sm sm:px-6 dark:border-black-600 dark:bg-black-800 dark:shadow-none">
									<AgreementRelevantTeamsPanel
										config={config}
										readOnly={!headerEditMode}
										relevantTeamIds={relevantTeamIds}
										draftSettings={relevantTeamsDraft}
										onUpdateTeamSettings={handleRelevantTeamSettingsPatch}
										onRemoveTeam={handleRemoveRelevantTeam}
									/>
								</div>
							) : null}
						</div>
					) : (
						<div className="flex min-w-0 max-w-full flex-col gap-4">
							{configurationTabWizardSteps.length === 0 ? (
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									No wizard steps to show here. Authoring and Clauses are excluded from this tab; add other
									steps under General → Additional steps.
								</p>
							) : (
								<>
									<div className="flex flex-col gap-3 border-b border-neutral-200 pb-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4 dark:border-black-600">
										<div className="min-w-0 flex-1">
											<Tabs
												items={configurationSubTabItems}
												activeKey={activeConfigurationStepKey}
												onChange={(key) => setConfigurationStepSubTabKey(key)}
												variant="underline"
												size="sm"
												className="w-full min-w-0"
												underlineActiveClassName="text-primary-600 dark:text-primary-400"
												underlineInactiveClassName="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-300"
												underlineIndicatorClassName="bg-primary-500 dark:bg-primary-400"
											/>
										</div>
										{headerEditMode ? (
											<div className="flex shrink-0 items-center justify-end gap-2 sm:pb-0.5">
												<Button
													type="button"
													size="sm"
													appearance="outlined"
													status="secondary-neutral"
													onClick={handleCancelHeaderEdit}
													disabled={configureMutation.isPending}
												>
													Cancel
												</Button>
												<Button
													type="button"
													size="sm"
													onClick={() => void handleSaveConfigurationLayout()}
													loading={configureMutation.isPending}
												>
													Save
												</Button>
											</div>
										) : null}
									</div>
									<div className="overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 py-6 shadow-sm sm:px-6 dark:border-black-600 dark:bg-black-800 dark:shadow-none">
										<AgreementStepLayoutPanel
											readOnly={!headerEditMode}
											displaySections={panelSectionsForConfigurationTab}
											onSectionsChange={
												headerEditMode && activeConfigurationStepKey
													? (sections) =>
															handleLayoutSectionsChange(
																sections,
																displaySectionsForConfigurationTab,
																activeConfigurationStepKey
															)
													: undefined
											}
											onOpenAddSection={headerEditMode ? handleOpenLayoutAddSection : undefined}
											onOpenAddField={headerEditMode ? handleOpenLayoutAddField : undefined}
											onRemoveFieldFromSection={
												headerEditMode ? handleRemoveLayoutFieldFromSection : undefined
											}
											onRenameSection={headerEditMode ? handleRenameLayoutSection : undefined}
										/>
									</div>
								</>
							)}
						</div>
					)}
				</div>
				</Card>
			</div>
		</CardMain>

			<Modal
				open={addLayoutSectionOpen}
				onCancel={handleCloseLayoutAddSection}
				width={480}
				header={
					<h2 id={addLayoutSectionTitleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
						Add Section
					</h2>
				}
				footer={
					<div className="flex justify-end">
						<Button type="submit" form="add-agreement-layout-section-form" size="md" appearance="filled" status="primary">
							Add Section
						</Button>
					</div>
				}
				aria-labelledby={addLayoutSectionTitleId}
			>
				<form
					id="add-agreement-layout-section-form"
					className="flex flex-col gap-4"
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmitLayoutAddSection();
					}}
				>
					<FormInput
						placeholder="Enter section name"
						value={newLayoutSectionName}
						onChange={(e) => {
							setNewLayoutSectionName(e.target.value);
							setNewLayoutSectionError(undefined);
						}}
						error={newLayoutSectionError}
					/>
				</form>
			</Modal>

			<AddFieldsModal
				open={addLayoutFieldModalOpen}
				sectionKey={addLayoutFieldSectionKey}
				excludeFieldIds={excludeLayoutFieldIdsForModal}
				agreementConfigId={id}
				defaultFieldContext={
					config ? buildAgreementConfigFieldContextLabel(config) ?? undefined : undefined
				}
				onClose={handleCloseLayoutAddFieldModal}
				onConfirm={handleConfirmLayoutAddFields}
			/>

			<AddRelevantTeamsModal
				open={addRelevantTeamsModalOpen}
				onClose={() => !addRelevantTeamsPending && setAddRelevantTeamsModalOpen(false)}
				excludedIds={relevantTeamIds}
				pending={addRelevantTeamsPending || configureMutation.isPending}
				onConfirm={(teams) => void handleConfirmAddRelevantTeams(teams)}
			/>
		</>
	);
};
