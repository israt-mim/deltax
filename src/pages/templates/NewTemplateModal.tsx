import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import { Modal } from "../../components/base/Modal";
import { Button } from "../../components/base/Button";
import { FormInput } from "../../components/form-input/FormInput";
import { FormSelect } from "../../components/form-input/FormSelect";
import { FormTextarea } from "../../components/form-input/FormTextarea";
import { SearchInput } from "../../components/form-input/SearchInput";
import {
	useAgreementCategoriesQuery,
	useAgreementDomainsQuery,
	useAgreementSubtypesQuery,
	useAgreementTypesQuery,
} from "../../api/hooks/agreementCatalog";
import {
	useCreateTemplateMutation,
	useTemplateDetailQuery,
	useTemplatesInfiniteList,
} from "../../api/hooks/templates";
import { formatUserFacingError } from "../../lib/formatUserFacingError";

type Step = "choose" | "blank" | "template-form" | "picker";

const DESCRIPTION_MAX = 128;
const EMPTY_CONTENT = { type: "doc", content: [{ type: "paragraph" }] };

interface BlankForm {
	name: string;
	categoryId: string;
	domainId: string;
	typeId: string;
	subtypeId: string;
	description: string;
}

interface BlankFormErrors {
	name?: string;
	categoryId?: string;
	domainId?: string;
	typeId?: string;
	subtypeId?: string;
}

function toOptions(data: { _id: string; name: string }[] | undefined) {
	return (data ?? []).map((item) => ({ value: item._id, label: item.name }));
}

// ── Step 1: Choose ────────────────────────────────────────────────────────────

function ChooseStep({ onBlank, onTemplate }: { onBlank: () => void; onTemplate: () => void }) {
	return (
		<div className="flex flex-col gap-3">
			<button
				type="button"
				onClick={onBlank}
				className="flex items-center gap-4 rounded-xl border border-primary-100 bg-primary-50 p-5 text-left transition-all hover:border-primary-300 hover:bg-primary-100 dark:border-primary-900 dark:bg-primary-950 dark:hover:border-primary-700 dark:hover:bg-primary-900"
			>
				<AutoAwesomeOutlinedIcon
					sx={{ fontSize: 32 }}
					className="shrink-0 text-primary-500 dark:text-primary-400"
				/>
				<div>
					<p className="text-sm font-semibold text-primary-600 dark:text-primary-300">
						Start with a Blank Document
					</p>
					<p className="mt-0.5 text-xs text-primary-500 dark:text-primary-400">
						Start your document from scratch with a clean, empty canvas.
					</p>
				</div>
			</button>

			<button
				type="button"
				onClick={onTemplate}
				className="flex items-center gap-4 rounded-xl border border-primary-100 bg-primary-50 p-5 text-left transition-all hover:border-primary-300 hover:bg-primary-100 dark:border-primary-900 dark:bg-primary-950 dark:hover:border-primary-700 dark:hover:bg-primary-900"
			>
				<TouchAppOutlinedIcon
					sx={{ fontSize: 32 }}
					className="shrink-0 text-primary-500 dark:text-primary-400"
				/>
				<div>
					<p className="text-sm font-semibold text-primary-600 dark:text-primary-300">
						Start with a Template
					</p>
					<p className="mt-0.5 text-xs text-primary-500 dark:text-primary-400">
						Browse and choose from a variety of pre-designed templates.
					</p>
				</div>
			</button>
		</div>
	);
}

// ── Shared form (blank + template-form steps) ─────────────────────────────────

export interface LockedCdts {
	categoryId: string;
	categoryName: string;
	domainId: string;
	domainName: string;
	typeId: string;
	typeName: string;
	subtypeId: string;
	subtypeName: string;
}


function DocumentFormStep({
	form,
	errors,
	onChange,
	isOpen,
	lockedCdts,
}: {
	form: BlankForm;
	errors: BlankFormErrors;
	onChange: (patch: Partial<BlankForm>) => void;
	isOpen: boolean;
	lockedCdts?: LockedCdts;
}) {
	const categoriesQuery = useAgreementCategoriesQuery({ enabled: isOpen && !lockedCdts });
	const domainsQuery = useAgreementDomainsQuery({
		agreementCategoryId: form.categoryId,
		enabled: isOpen && !lockedCdts,
	});
	const typesQuery = useAgreementTypesQuery({
		agreementDomainId: form.domainId,
		enabled: isOpen && !lockedCdts,
	});
	const subtypesQuery = useAgreementSubtypesQuery({
		agreementTypeId: form.typeId,
		enabled: isOpen && !lockedCdts,
	});

	const categoryOptions = useMemo(
		() => toOptions(categoriesQuery.data?.data),
		[categoriesQuery.data],
	);
	const domainOptions = useMemo(
		() => toOptions(domainsQuery.data?.data),
		[domainsQuery.data],
	);
	const typeOptions = useMemo(
		() => toOptions(typesQuery.data?.data),
		[typesQuery.data],
	);
	const subtypeOptions = useMemo(
		() => toOptions(subtypesQuery.data?.data),
		[subtypesQuery.data],
	);

	return (
		<div className="flex flex-col gap-4">
			<FormInput
				label="Name"
				required
				value={form.name}
				onChange={(e) => onChange({ name: e.target.value })}
				placeholder="New Document"
				error={errors.name}
				maxLength={200}
			/>

			{!lockedCdts && (
				<div className="grid grid-cols-2 gap-4">
					<FormSelect
						label="Category"
						required
						value={form.categoryId || undefined}
						onChange={(v) => onChange({ categoryId: v as string, domainId: "", typeId: "", subtypeId: "" })}
						options={categoryOptions}
						placeholder="Select category"
						loading={categoriesQuery.isPending}
						error={errors.categoryId}
						style={{ width: "100%" }}
					/>
					<FormSelect
						label="Domain"
						required
						value={form.domainId || undefined}
						onChange={(v) => onChange({ domainId: v as string, typeId: "", subtypeId: "" })}
						options={domainOptions}
						placeholder="Select domain"
						disabled={!form.categoryId}
						loading={domainsQuery.isPending}
						error={errors.domainId}
						style={{ width: "100%" }}
					/>
					<FormSelect
						label="Type"
						required
						value={form.typeId || undefined}
						onChange={(v) => onChange({ typeId: v as string, subtypeId: "" })}
						options={typeOptions}
						placeholder="Select type"
						disabled={!form.domainId}
						loading={typesQuery.isPending}
						error={errors.typeId}
						style={{ width: "100%" }}
					/>
					<FormSelect
						label="SubType"
						required
						value={form.subtypeId || undefined}
						onChange={(v) => onChange({ subtypeId: v as string })}
						options={subtypeOptions}
						placeholder="Select sub type"
						disabled={!form.typeId}
						loading={subtypesQuery.isPending}
						error={errors.subtypeId}
						style={{ width: "100%" }}
					/>
				</div>
			)}

			<div className="flex flex-col gap-1">
				<FormTextarea
					label="Description"
					value={form.description}
					onChange={(e) => onChange({ description: e.target.value.slice(0, DESCRIPTION_MAX) })}
					placeholder="Enter description"
					rows={4}
					maxLength={DESCRIPTION_MAX}
					showCount
				/>
			</div>
		</div>
	);
}

// ── Step 3 (template path): Template picker ───────────────────────────────────

interface CdtsFilter {
	categoryId: string;
	domainId: string;
	typeId: string;
	subtypeId: string;
}

function TemplatePickerStep({
	selectedId,
	onSelect,
	isOpen,
	filters,
}: {
	selectedId: string;
	onSelect: (id: string) => void;
	isOpen: boolean;
	filters: CdtsFilter;
}) {
	const [search, setSearch] = useState("");

	const listQuery = useTemplatesInfiniteList({
		sort: "-createdAt",
		enabled: isOpen,
		category: filters.categoryId || undefined,
		domain: filters.domainId || undefined,
		type: filters.typeId || undefined,
		subtype: filters.subtypeId || undefined,
	});
	const templates = useMemo(
		() => listQuery.data?.pages.flatMap((p) => p.data) ?? [],
		[listQuery.data],
	);
	const filtered = useMemo(
		() =>
			search.trim()
				? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
				: templates,
		[templates, search],
	);

	const detailQuery = useTemplateDetailQuery({ id: selectedId || undefined });
	const preview = detailQuery.data;

	// Auto-select first item when list loads
	useEffect(() => {
		if (!selectedId && templates.length > 0) {
			onSelect(templates[0].id);
		}
	}, [templates, selectedId, onSelect]);

	const selectedName =
		preview?.name ?? templates.find((t) => t.id === selectedId)?.name ?? "";

	return (
		<div className="flex gap-0" style={{ height: 520 }}>
			{/* Preview panel */}
			<div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
				{selectedId && (
					<div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
						<p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
							{selectedName}
						</p>
					</div>
				)}
				<div className="flex-1 overflow-y-auto p-4">
					{detailQuery.isPending && selectedId ? (
						<div className="flex h-full items-center justify-center text-sm text-neutral-400">
							Loading preview…
						</div>
					) : preview?.content_html ? (
						<div
							className="doc-editor-content mx-auto max-w-2xl rounded bg-white p-8 shadow-sm dark:bg-neutral-900"
							dangerouslySetInnerHTML={{ __html: preview.content_html }}
						/>
					) : (
						<div className="flex h-full items-center justify-center text-sm text-neutral-400">
							{selectedId ? "No preview available" : "Select a template to preview"}
						</div>
					)}
				</div>
			</div>

			{/* List panel */}
			<div className="flex w-64 shrink-0 flex-col border-l border-neutral-200 dark:border-neutral-700">
				<div className="border-b border-neutral-200 p-3 dark:border-neutral-700">
					<SearchInput
						placeholder="Search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						allowClear
					/>
				</div>

				<div className="flex-1 overflow-y-auto">
					{listQuery.isPending ? (
						<div className="p-4 text-center text-sm text-neutral-400">Loading…</div>
					) : filtered.length === 0 ? (
						<div className="p-4 text-center text-sm text-neutral-400">No templates found</div>
					) : (
						filtered.map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => onSelect(t.id)}
								className={[
									"w-full border-b border-neutral-100 px-4 py-3 text-left text-sm transition-colors",
									"dark:border-neutral-800",
									t.id === selectedId
										? "border border-primary-400 bg-primary-50 font-medium text-primary-700 dark:border-primary-600 dark:bg-primary-950 dark:text-primary-300"
										: "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800",
								].join(" ")}
							>
								{t.name}
							</button>
						))
					)}
				</div>
			</div>
		</div>
	);
}

// ── Root modal ────────────────────────────────────────────────────────────────

interface NewTemplateModalProps {
	open: boolean;
	onClose: () => void;
	onCreated: (id: string) => void;
	lockedCdts?: LockedCdts;
	agreementId?: string;
}

const DEFAULT_FORM: BlankForm = {
	name: "New Document",
	categoryId: "",
	domainId: "",
	typeId: "",
	subtypeId: "",
	description: "",
};

export function NewTemplateModal({ open, onClose, onCreated, lockedCdts, agreementId }: NewTemplateModalProps) {
	const [step, setStep] = useState<Step>("choose");
	const [form, setForm] = useState<BlankForm>(() =>
		lockedCdts
			? { ...DEFAULT_FORM, categoryId: lockedCdts.categoryId, domainId: lockedCdts.domainId, typeId: lockedCdts.typeId, subtypeId: lockedCdts.subtypeId }
			: DEFAULT_FORM,
	);
	const [errors, setErrors] = useState<BlankFormErrors>({});
	const [selectedTemplateId, setSelectedTemplateId] = useState("");

	// Keep form CDTS in sync if lockedCdts changes while modal is open
	useEffect(() => {
		if (lockedCdts) {
			setForm((prev) => ({
				...prev,
				categoryId: lockedCdts.categoryId,
				domainId: lockedCdts.domainId,
				typeId: lockedCdts.typeId,
				subtypeId: lockedCdts.subtypeId,
			}));
		}
	}, [lockedCdts]);

	const createMutation = useCreateTemplateMutation();
	const selectedDetailQuery = useTemplateDetailQuery({
		id: step === "picker" ? selectedTemplateId || undefined : undefined,
	});

	const patchForm = useCallback((patch: Partial<BlankForm>) => {
		setForm((prev) => ({ ...prev, ...patch }));
		setErrors((prev) => {
			const next = { ...prev };
			for (const key of Object.keys(patch) as (keyof BlankForm)[]) {
				delete next[key as keyof BlankFormErrors];
			}
			return next;
		});
	}, []);

	const resetAndClose = useCallback(() => {
		setStep("choose");
		setForm(DEFAULT_FORM);
		setErrors({});
		setSelectedTemplateId("");
		onClose();
	}, [onClose]);

	const validate = useCallback((): boolean => {
		const e: BlankFormErrors = {};
		if (!form.name.trim()) e.name = "Name is required";
		if (!form.categoryId) e.categoryId = "Category is required";
		if (!form.domainId) e.domainId = "Domain is required";
		if (!form.typeId) e.typeId = "Type is required";
		if (!form.subtypeId) e.subtypeId = "Subtype is required";
		setErrors(e);
		return Object.keys(e).length === 0;
	}, [form]);

	const handleCreateBlank = useCallback(async () => {
		if (!validate()) return;
		try {
			const tpl = await createMutation.mutateAsync({
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				content: EMPTY_CONTENT,
				content_html: "<p></p>",
				agreement_category: form.categoryId,
				agreement_domain: form.domainId,
				agreement_type: form.typeId,
				agreement_subtype: form.subtypeId,
				...(agreementId ? { agreement: agreementId } : {}),
			});
			resetAndClose();
			onCreated(tpl._id);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not create template."));
		}
	}, [form, validate, createMutation, resetAndClose, onCreated]);

	const handleCreateFromTemplate = useCallback(async () => {
		const src = selectedDetailQuery.data;
		if (!src) return;
		try {
			const tpl = await createMutation.mutateAsync({
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				content: src.content ?? EMPTY_CONTENT,
				content_html: src.content_html ?? "<p></p>",
				agreement_category: form.categoryId,
				agreement_domain: form.domainId,
				agreement_type: form.typeId,
				agreement_subtype: form.subtypeId,
				...(agreementId ? { agreement: agreementId } : {}),
			});
			resetAndClose();
			onCreated(tpl._id);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not create template."));
		}
	}, [form, selectedDetailQuery.data, createMutation, resetAndClose, onCreated]);

	const handleNextTopicker = useCallback(() => {
		if (!validate()) return;
		setSelectedTemplateId("");
		setStep("picker");
	}, [validate]);

	const modalConfig = useMemo(() => {
		switch (step) {
			case "choose":
				return {
					header: "New Document",
					width: 520,
					footer: null as React.ReactNode,
				};
			case "blank":
				return {
					header: "Start From a Blank Document",
					width: 520,
					footer: (
						<div className="flex justify-between">
							<Button
								size="lg"
								status="secondary-neutral"
								appearance="outlined"
								onClick={resetAndClose}
							>
								Cancel
							</Button>
							<Button
								size="lg"
								onClick={() => void handleCreateBlank()}
								loading={createMutation.isPending}
								disabled={createMutation.isPending}
							>
								Create
							</Button>
						</div>
					),
				};
			case "template-form":
				return {
					header: "Start with a Template",
					width: 520,
					footer: (
						<div className="flex justify-between">
							<Button
								size="lg"
								status="secondary-neutral"
								appearance="outlined"
								onClick={resetAndClose}
							>
								Cancel
							</Button>
							<div className="flex gap-2">
								<Button
									size="lg"
									status="secondary-neutral"
									appearance="outlined"
									onClick={() => setStep("choose")}
								>
									Previous
								</Button>
								<Button size="lg" onClick={handleNextTopicker}>
									Next
								</Button>
							</div>
						</div>
					),
				};
			case "picker":
				return {
					header: "Select a Template",
					width: 960,
					footer: (
						<div className="flex justify-between">
							<Button
								size="lg"
								status="secondary-neutral"
								appearance="outlined"
								onClick={resetAndClose}
							>
								Cancel
							</Button>
							<div className="flex gap-2">
								<Button
									size="lg"
									status="secondary-neutral"
									appearance="outlined"
									onClick={() => setStep("template-form")}
								>
									Previous
								</Button>
								<Button
									size="lg"
									onClick={() => void handleCreateFromTemplate()}
									loading={createMutation.isPending}
									disabled={!selectedTemplateId || createMutation.isPending}
								>
									Create
								</Button>
							</div>
						</div>
					),
				};
		}
	}, [
		step,
		resetAndClose,
		handleCreateBlank,
		handleCreateFromTemplate,
		handleNextTopicker,
		createMutation.isPending,
		selectedTemplateId,
	]);

	const cdtsFilter: CdtsFilter = {
		categoryId: form.categoryId,
		domainId: form.domainId,
		typeId: form.typeId,
		subtypeId: form.subtypeId,
	};

	return (
		<Modal
			open={open}
			onCancel={resetAndClose}
			header={<span className="text-base font-semibold text-neutral-900 dark:text-white">{modalConfig.header}</span>}
			width={modalConfig.width}
			footer={modalConfig.footer}
		>
			{step === "choose" && (
				<ChooseStep
					onBlank={() => setStep("blank")}
					onTemplate={() => setStep("template-form")}
				/>
			)}
			{(step === "blank" || step === "template-form") && (
				<DocumentFormStep
					form={form}
					errors={errors}
					onChange={patchForm}
					isOpen={open && (step === "blank" || step === "template-form")}
					lockedCdts={lockedCdts}
				/>
			)}
			{step === "picker" && (
				<TemplatePickerStep
					selectedId={selectedTemplateId}
					onSelect={setSelectedTemplateId}
					isOpen={open && step === "picker"}
					filters={cdtsFilter}
				/>
			)}
		</Modal>
	);
}
