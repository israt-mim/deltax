import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../components/base/Modal";
import { Button } from "../../components/base/Button";
import { FormInput } from "../../components/form-input/FormInput";
import { FormSelect } from "../../components/form-input/FormSelect";
import { useCreateAgreementMutation } from "../../api";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { useAppSelector } from "../../store/hooks";

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

export function NewContractModal({ open, onClose, categoryId, domainId }: NewContractModalProps) {
	const navigate = useNavigate();
	const createMutation = useCreateAgreementMutation();
	const details = useAppSelector((s) => s.agreementDetails.data);

	const [displayName, setDisplayName] = useState("");
	const [agreementType, setAgreementType] = useState("");
	const [agreementSubtype, setAgreementSubtype] = useState("");
	const [errors, setErrors] = useState<Step0Errors>({});
	const [submitError, setSubmitError] = useState<string | null>(null);

	const categories = details?.categories ?? [];
	const selectedCategory = useMemo(
		() => categories.find((c) => c._id === (categoryId ?? "").trim()),
		[categories, categoryId]
	);
	const selectedDomain = useMemo(
		() => selectedCategory?.domains.find((d) => d._id === (domainId ?? "").trim()),
		[selectedCategory, domainId]
	);

	const typeOptions = useMemo(
		() => selectedDomain?.types.map((t) => ({ value: t._id, label: t.name })) ?? [],
		[selectedDomain]
	);
	const subtypeOptions = useMemo(() => {
		const selectedType = selectedDomain?.types.find((t) => t._id === agreementType.trim());
		return selectedType?.subtypes.map((s) => ({ value: s._id, label: s.name })) ?? [];
	}, [selectedDomain, agreementType]);

	useEffect(() => {
		if (!open) return;
		setDisplayName(generateDisplayName());
		setAgreementType("");
		setAgreementSubtype("");
		setErrors({});
		setSubmitError(null);
	}, [open]);

	const validate = useCallback(() => {
		const nextErrors: Step0Errors = {};
		if (!selectedCategory?._id) nextErrors.category = "Category from URL is missing";
		if (!selectedDomain?._id) nextErrors.domain = "Domain from URL is missing";
		if (!displayName.trim()) nextErrors.displayName = "Display name is required";
		if (!agreementType.trim()) nextErrors.agreementType = "Type is required";
		if (!agreementSubtype.trim()) nextErrors.agreementSubtype = "Subtype is required";
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}, [selectedCategory?._id, selectedDomain?._id, displayName, agreementType, agreementSubtype]);

	const handleCreate = useCallback(async () => {
		setSubmitError(null);
		if (!validate()) return;
		const selectedType = selectedDomain?.types.find((t) => t._id === agreementType.trim());
		const selectedSubtype = selectedType?.subtypes.find((s) => s._id === agreementSubtype.trim());
		if (!selectedType?._id || !selectedSubtype?._id) {
			setSubmitError("Type/Subtype is invalid for the selected category/domain.");
			return;
		}
		try {
			const created = await createMutation.mutateAsync({
				agreement_category_id: selectedCategory!._id,
				agreement_domain_id: selectedDomain!._id,
				agreement_type_id: selectedType._id,
				agreement_subtype_id: selectedSubtype._id,
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
		selectedCategory,
		selectedDomain,
		displayName,
		agreementType,
		agreementSubtype,
		onClose,
		navigate,
	]);

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
						onClick={() => void handleCreate()}
					>
						Continue
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-5">
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
					<FormSelect
						label="Category"
						value={selectedCategory?._id || undefined}
						options={
							selectedCategory ? [{ value: selectedCategory._id, label: selectedCategory.name }] : []
						}
						disabled
						error={errors.category}
						placeholder="Category"
					/>
					<FormSelect
						label="Domain"
						value={selectedDomain?._id || undefined}
						options={selectedDomain ? [{ value: selectedDomain._id, label: selectedDomain.name }] : []}
						disabled
						error={errors.domain}
						placeholder="Domain"
					/>
					<FormSelect
						label="Type"
						required
						value={agreementType || undefined}
						options={typeOptions}
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
						label="Subtype"
						required
						value={agreementSubtype || undefined}
						options={subtypeOptions}
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
