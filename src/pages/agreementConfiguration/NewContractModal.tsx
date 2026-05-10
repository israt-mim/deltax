import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../components/base/Modal";
import { Button } from "../../components/base/Button";
import { FormInput } from "../../components/form-input/FormInput";
import { FormSelect } from "../../components/form-input/FormSelect";
import { useCreateAgreementMutation } from "../../api";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { useAppSelector } from "../../store/hooks";
import { resolveAgreementCatalogContext } from "./resolveAgreementCatalogContext";

type Step0Errors = Partial<{
	displayName: string;
	category: string;
	domain: string;
	agreementType: string;
	agreementSubtype: string;
}>;

export interface NewContractModalProps {
	open: boolean;
	onClose: () => void;
	categoryId?: string;
	domainId?: string;
}

function generateDisplayName(): string {
	const rand = Math.random().toString(36).slice(2, 10);
	return `Agreement-${rand}`;
}

function trimId(id?: string | null): string {
	return (id ?? "").trim();
}

function categoryRowId(c: { _id?: string; id?: string }) {
	return trimId(c._id ?? c.id);
}

function domainRowId(d: { _id?: string; id?: string }) {
	return trimId(d._id ?? d.id);
}

function typeRowId(t: { _id?: string; id?: string }) {
	return trimId(t._id ?? t.id);
}

export function NewContractModal({ open, onClose, categoryId, domainId }: NewContractModalProps) {
	const navigate = useNavigate();
	const createMutation = useCreateAgreementMutation();
	const details = useAppSelector((s) => s.agreementDetails.data);
	const detailsStatus = useAppSelector((s) => s.agreementDetails.status);

	const [displayName, setDisplayName] = useState("");
	const [agreementType, setAgreementType] = useState("");
	const [agreementSubtype, setAgreementSubtype] = useState("");
	const [errors, setErrors] = useState<Step0Errors>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pickedCategoryId, setPickedCategoryId] = useState("");
	const [pickedDomainId, setPickedDomainId] = useState("");
	/** Bumps when modal opens so Type/Subtype Select remounts (clears stale search filter → “No data”). */
	const [selectEpoch, setSelectEpoch] = useState(0);

	const categories = details?.categories ?? [];
	const catProp = trimId(categoryId);
	const domProp = trimId(domainId);
	/** Both ids from the route — category/domain always follow URL, not manual picks. */
	const hasRouteCatalogIds = Boolean(catProp && domProp);
	const effectiveCategoryId = hasRouteCatalogIds ? catProp : trimId(pickedCategoryId);
	const effectiveDomainId = hasRouteCatalogIds ? domProp : trimId(pickedDomainId);

	const { category: selectedCategory, domain: selectedDomain } = useMemo(() => {
		if (hasRouteCatalogIds) {
			return resolveAgreementCatalogContext(categories, catProp, domProp);
		}
		return resolveAgreementCatalogContext(
			categories,
			effectiveCategoryId || undefined,
			effectiveDomainId || undefined
		);
	}, [categories, hasRouteCatalogIds, catProp, domProp, effectiveCategoryId, effectiveDomainId]);

	const categoryLabelFromRoute = useMemo(() => {
		if (!catProp) return "";
		const c = categories.find((x) => categoryRowId(x) === catProp);
		return (c?.name ?? "").trim() || catProp;
	}, [categories, catProp]);

	const domainLabelFromRoute = useMemo(() => {
		if (!domProp) return "";
		for (const c of categories) {
			const found = (c.domains ?? []).find((x) => domainRowId(x) === domProp);
			if (found?.name?.trim()) return found.name.trim();
		}
		return domProp;
	}, [categories, domProp]);

	const typeOptions = useMemo(() => {
		const types = selectedDomain?.types ?? [];
		return types
			.filter((t) => typeRowId(t))
			.map((t) => ({
				value: typeRowId(t),
				label: (t.name ?? typeRowId(t)).trim() || typeRowId(t),
			}));
	}, [selectedDomain]);

	const subtypeOptions = useMemo(() => {
		const selectedType = (selectedDomain?.types ?? []).find((t) => typeRowId(t) === trimId(agreementType));
		const subtypes = selectedType?.subtypes ?? [];
		return subtypes
			.filter((s) => typeRowId(s))
			.map((s) => {
				const sid = typeRowId(s);
				return { value: sid, label: (s.name ?? sid).trim() || sid };
			});
	}, [selectedDomain, agreementType]);

	const categoryOptionsAll = useMemo(
		() =>
			categories.map((c) => ({
				value: categoryRowId(c),
				label: (c.name ?? categoryRowId(c)).trim() || categoryRowId(c),
			})),
		[categories]
	);

	const domainOptionsForPick = useMemo(() => {
		const cat = categories.find((c) => categoryRowId(c) === effectiveCategoryId);
		return (cat?.domains ?? []).map((d) => ({
			value: domainRowId(d),
			label: (d.name ?? domainRowId(d)).trim() || domainRowId(d),
		}));
	}, [categories, effectiveCategoryId]);

	useEffect(() => {
		if (!open) return;
		setDisplayName(generateDisplayName());
		setAgreementType("");
		setAgreementSubtype("");
		setPickedCategoryId("");
		setPickedDomainId("");
		setErrors({});
		setSubmitError(null);
		setSelectEpoch((n) => n + 1);
	}, [open]);

	const validate = useCallback(() => {
		const nextErrors: Step0Errors = {};
		if (hasRouteCatalogIds) {
			if (!catProp) nextErrors.category = "Category id from route is missing";
			if (!domProp) nextErrors.domain = "Domain id from route is missing";
			if (!selectedDomain) {
				nextErrors.domain = "This domain was not found in the catalog for the route you are on.";
			}
		} else {
			if (!selectedCategory) nextErrors.category = "Category is required";
			if (!selectedDomain) nextErrors.domain = "Domain is required";
		}
		if (!displayName.trim()) nextErrors.displayName = "Display name is required";
		if (!agreementType.trim()) nextErrors.agreementType = "Type is required";
		if (!agreementSubtype.trim()) nextErrors.agreementSubtype = "Subtype is required";
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}, [
		hasRouteCatalogIds,
		catProp,
		domProp,
		selectedCategory,
		selectedDomain,
		displayName,
		agreementType,
		agreementSubtype,
	]);

	const handleCreate = useCallback(async () => {
		setSubmitError(null);
		if (!validate()) return;
		const selectedType = (selectedDomain?.types ?? []).find((t) => typeRowId(t) === agreementType.trim());
		const selectedSubtype = (selectedType?.subtypes ?? []).find(
			(s) => typeRowId(s) === agreementSubtype.trim()
		);
		const catId = hasRouteCatalogIds ? catProp : categoryRowId(selectedCategory!);
		const domId = hasRouteCatalogIds ? domProp : domainRowId(selectedDomain!);
		const typeId = typeRowId(selectedType);
		const subtypeId = selectedSubtype ? typeRowId(selectedSubtype) : "";
		if (!catId || !domId || !typeId || !subtypeId) {
			setSubmitError("Type/Subtype is invalid for the selected category/domain.");
			return;
		}
		try {
			const created = await createMutation.mutateAsync({
				agreement_category_id: catId,
				agreement_domain_id: domId,
				agreement_type_id: typeId,
				agreement_subtype_id: subtypeId,
				agreement_display_name: displayName.trim(),
				agreement_type: selectedType.name,
				agreement_subtype: selectedSubtype.name,
			});
			onClose();
			void navigate(`/agreements/create/${encodeURIComponent(created.id)}`);
		} catch (error) {
			setSubmitError(formatUserFacingError(error, "Could not create contract."));
		}
	}, [
		validate,
		createMutation,
		hasRouteCatalogIds,
		catProp,
		domProp,
		selectedCategory,
		selectedDomain,
		displayName,
		agreementType,
		agreementSubtype,
		onClose,
		navigate,
	]);

	const catalogLoading = detailsStatus === "loading" || detailsStatus === "idle";
	const catalogMissing = detailsStatus === "failed" || (detailsStatus === "succeeded" && !details);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={900}
			header={<h2 className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">New Contracts</h2>}
			footer={
				<div className="flex items-center justify-between">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						onClick={onClose}
					>
						Back
					</Button>
					<Button
						type="button"
						size="md"
						appearance="filled"
						status="primary"
						loading={createMutation.isPending}
						disabled={catalogLoading || catalogMissing}
						onClick={() => void handleCreate()}
					>
						Continue
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-5">
				{catalogMissing ? (
					<p className="text-sm text-error-600 dark:text-error-400">
						Agreement catalog could not be loaded. Refresh the page and try again.
					</p>
				) : catalogLoading ? (
					<p className="text-sm text-neutral-500 dark:text-neutral-400">Loading catalog…</p>
				) : null}

				<FormInput
					label="Display Name"
					required
					value={displayName}
					onChange={(e) => {
						setDisplayName(e.target.value);
						if (errors.displayName) setErrors((s) => ({ ...s, displayName: undefined }));
					}}
					error={errors.displayName}
				/>

				<div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
					{hasRouteCatalogIds ? (
						<>
							<FormSelect
								label="Category"
								value={catProp}
								options={[{ value: catProp, label: categoryLabelFromRoute }]}
								disabled
								error={errors.category}
								placeholder="Category"
							/>
							<FormSelect
								label="Domain"
								value={domProp}
								options={[{ value: domProp, label: domainLabelFromRoute }]}
								disabled
								error={errors.domain}
								placeholder="Domain"
							/>
						</>
					) : (
						<>
							<FormSelect
								label="Category"
								required
								value={effectiveCategoryId || undefined}
								options={categoryOptionsAll}
								disabled={catalogLoading || catalogMissing}
								onChange={(value) => {
									const v = String(value ?? "");
									setPickedCategoryId(v);
									setPickedDomainId("");
									setAgreementType("");
									setAgreementSubtype("");
									if (errors.category) setErrors((s) => ({ ...s, category: undefined }));
								}}
								error={errors.category}
								placeholder="Select category"
								showSearch
								optionFilterProp="label"
							/>
							<FormSelect
								label="Domain"
								required
								value={effectiveDomainId || undefined}
								options={domainOptionsForPick}
								disabled={catalogLoading || catalogMissing || !effectiveCategoryId}
								onChange={(value) => {
									setPickedDomainId(String(value ?? ""));
									setAgreementType("");
									setAgreementSubtype("");
									if (errors.domain) setErrors((s) => ({ ...s, domain: undefined }));
								}}
								error={errors.domain}
								placeholder="Select domain"
								showSearch
								optionFilterProp="label"
							/>
						</>
					)}
					<FormSelect
						key={`agreement-type-${selectEpoch}-${effectiveDomainId}-${typeOptions.length}`}
						label="Type"
						required
						value={agreementType || undefined}
						options={typeOptions}
						disabled={catalogLoading || catalogMissing || !selectedDomain}
						onChange={(value) => {
							setAgreementType(String(value ?? ""));
							setAgreementSubtype("");
							if (errors.agreementType) setErrors((s) => ({ ...s, agreementType: undefined }));
						}}
						error={errors.agreementType}
						placeholder="Select Agreement Type"
						showSearch
						optionFilterProp="label"
					/>
					<FormSelect
						key={`agreement-subtype-${selectEpoch}-${agreementType}-${subtypeOptions.length}`}
						label="Subtype"
						required
						value={agreementSubtype || undefined}
						options={subtypeOptions}
						disabled={catalogLoading || catalogMissing || !agreementType.trim()}
						onChange={(value) => {
							setAgreementSubtype(String(value ?? ""));
							if (errors.agreementSubtype) setErrors((s) => ({ ...s, agreementSubtype: undefined }));
						}}
						error={errors.agreementSubtype}
						placeholder="Select Agreement Subtype"
						showSearch
						optionFilterProp="label"
					/>
				</div>

				{submitError ? <p className="text-sm text-error-500">{submitError}</p> : null}
			</div>
		</Modal>
	);
}
