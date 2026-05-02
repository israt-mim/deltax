import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "antd";
import cn from "classnames";
import { Modal } from "../../components/base/Modal";
import { Button } from "../../components/base/Button";
import { FormCreatableSelect } from "../../components/form-input/FormCreatableSelect";
import { FormToggleField } from "../../components/form-input/FormToggleField";
import { FormSelect } from "../../components/form-input/FormSelect";
import {
	isMongoObjectIdString,
	useAgreementCategoriesQuery,
	useAgreementDomainsQuery,
	useAgreementStepsQuery,
	useAgreementSubtypesQuery,
	useAgreementTypesQuery,
	useCreateAgreementConfigMutation,
} from "../../api";
import { formatUserFacingError } from "../../lib/formatUserFacingError";

const STEP_LABELS = ["Configuration Type", "Additional Steps"] as const;

type Step0Errors = Partial<{
	category: string;
	domain: string;
	agreementType: string;
	agreementSubtype: string;
}>;

export interface NewAgreementConfigurationModalProps {
	open: boolean;
	onClose: () => void;
}

export const NewAgreementConfigurationModal = ({ open, onClose }: NewAgreementConfigurationModalProps) => {
	const navigate = useNavigate();
	const createMutation = useCreateAgreementConfigMutation();

	const [activeStep, setActiveStep] = useState(0);
	const [category, setCategory] = useState("");
	const [domain, setDomain] = useState("");
	const [agreementType, setAgreementType] = useState("");
	const [agreementSubtype, setAgreementSubtype] = useState("");
	const [step0Errors, setStep0Errors] = useState<Step0Errors>({});

	const [additionalStepsEnabled, setAdditionalStepsEnabled] = useState(false);
	const [selectedStepIds, setSelectedStepIds] = useState<string[]>([]);
	const [startButtonTooltip, setStartButtonTooltip] = useState<string | null>(null);

	const categoriesQuery = useAgreementCategoriesQuery({ enabled: open });
	const domainsQuery = useAgreementDomainsQuery({ agreementCategoryId: category, enabled: open });
	const typesQuery = useAgreementTypesQuery({ agreementDomainId: domain, enabled: open });
	const subtypesQuery = useAgreementSubtypesQuery({ agreementTypeId: agreementType, enabled: open });
	const stepsQuery = useAgreementStepsQuery({ enabled: open });

	const categoryOptions = useMemo(
		() => categoriesQuery.data?.data.map((c) => ({ value: c._id, label: c.name })) ?? [],
		[categoriesQuery.data]
	);
	const domainOptions = useMemo(
		() => domainsQuery.data?.data.map((d) => ({ value: d._id, label: d.name })) ?? [],
		[domainsQuery.data]
	);
	const typeOptions = useMemo(
		() => typesQuery.data?.data.map((t) => ({ value: t._id, label: t.name })) ?? [],
		[typesQuery.data]
	);
	const subtypeOptions = useMemo(
		() => subtypesQuery.data?.data.map((s) => ({ value: s._id, label: s.name })) ?? [],
		[subtypesQuery.data]
	);
	const stepOptions = useMemo(
		() => stepsQuery.data?.data.map((s) => ({ value: s._id, label: s.name })) ?? [],
		[stepsQuery.data]
	);

	const catalogError =
		categoriesQuery.error ?? domainsQuery.error ?? typesQuery.error ?? subtypesQuery.error;

	const resetForm = useCallback(() => {
		setActiveStep(0);
		setCategory("");
		setDomain("");
		setAgreementType("");
		setAgreementSubtype("");
		setStep0Errors({});
		setAdditionalStepsEnabled(false);
		setSelectedStepIds([]);
		setStartButtonTooltip(null);
	}, []);

	useEffect(() => {
		if (open) resetForm();
	}, [open, resetForm]);

	useEffect(() => {
		if (!additionalStepsEnabled) setSelectedStepIds([]);
	}, [additionalStepsEnabled]);

	const validateStep0 = useCallback((): boolean => {
		const e: Step0Errors = {};
		if (!category.trim()) e.category = "Category is required";
		if (!domain.trim()) e.domain = "Domain is required";
		if (!agreementType.trim()) e.agreementType = "Agreement type is required";
		if (!agreementSubtype.trim()) e.agreementSubtype = "Agreement subtype is required";
		setStep0Errors(e);
		return Object.keys(e).length === 0;
	}, [category, domain, agreementType, agreementSubtype]);

	const handleNext = () => {
		if (!validateStep0()) return;
		setActiveStep(1);
	};

	const handleStart = useCallback(async () => {
		setStartButtonTooltip(null);
		if (!additionalStepsEnabled) {
			setStartButtonTooltip('Turn on "Additional steps" and select at least one step.');
			return;
		}
		const steps = [...new Set(selectedStepIds)].filter(isMongoObjectIdString);
		if (steps.length === 0) {
			setStartButtonTooltip("Select at least one agreement step.");
			return;
		}

		try {
			const created = await createMutation.mutateAsync({
				agreement_category: category.trim(),
				agreement_domain: domain.trim(),
				agreement_type: agreementType.trim(),
				agreement_subtype: agreementSubtype.trim(),
				steps,
			});
			onClose();
			void navigate(`/configure/agreements/create/${encodeURIComponent(created._id)}`);
		} catch (err) {
			setStartButtonTooltip(formatUserFacingError(err, "Could not create agreement configuration."));
		}
	}, [
		additionalStepsEnabled,
		agreementSubtype,
		agreementType,
		category,
		createMutation,
		domain,
		navigate,
		onClose,
		selectedStepIds,
	]);

	const titleId = "new-agreement-config-modal-title";

	const startButton = (
		<Button
			type="button"
			size="md"
			appearance="filled"
			status="primary"
			loading={createMutation.isPending}
			onClick={() => void handleStart()}
		>
			Start configuration
		</Button>
	);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={720}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					New Agreement Configuration
				</h2>
			}
			footer={
				<div className="flex justify-end gap-3">
					{activeStep === 1 && (
						<Button
							type="button"
							size="md"
							appearance="outlined"
							status="secondary-neutral"
							onClick={() => {
								setStartButtonTooltip(null);
								setActiveStep(0);
							}}
						>
							Back
						</Button>
					)}
					{activeStep === 0 ? (
						<Button type="button" size="md" appearance="filled" status="primary" onClick={handleNext}>
							Next
						</Button>
					) : (
						<Tooltip
							title={startButtonTooltip ?? ""}
							open={startButtonTooltip !== null ? true : undefined}
							onOpenChange={(visible) => {
								if (!visible) setStartButtonTooltip(null);
							}}
							placement="top"
						>
							<span className="inline-flex">{startButton}</span>
						</Tooltip>
					)}
				</div>
			}
			aria-labelledby={titleId}
		>
			<div className="flex flex-col gap-5">
				<div className="flex border-b border-neutral-200 dark:border-black-500">
					{STEP_LABELS.map((label, i) => {
						const isActive = i === activeStep;
						return (
							<button
								key={label}
								type="button"
								onClick={() => {
									if (i === 0) {
										setStartButtonTooltip(null);
										setActiveStep(0);
									}
									if (i === 1 && validateStep0()) setActiveStep(1);
								}}
								className={cn(
									"relative flex-1 pb-3 text-sm font-medium transition-colors",
									isActive
										? "text-primary-600 dark:text-primary-300"
										: "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
								)}
							>
								{label}
								{isActive && (
									<span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-500" />
								)}
							</button>
						);
					})}
				</div>

				{activeStep === 0 && (
					<div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
						{catalogError && (
							<p className="col-span-full text-sm text-error-500">
								{formatUserFacingError(catalogError, "Could not load agreement catalog.")}{" "}
								<button
									type="button"
									className="font-medium text-primary-600 underline dark:text-primary-400"
									onClick={() => {
										void categoriesQuery.refetch();
										void domainsQuery.refetch();
										void typesQuery.refetch();
										void subtypesQuery.refetch();
									}}
								>
									Retry
								</button>
							</p>
						)}
						<FormCreatableSelect
							label="Category"
							required
							allowCreate
							loading={categoriesQuery.isFetching}
							value={category || undefined}
							onChange={(v) => {
								const next = String(v ?? "");
								setCategory(next);
								setDomain("");
								setAgreementType("");
								setAgreementSubtype("");
								if (step0Errors.category) setStep0Errors((s) => ({ ...s, category: undefined }));
							}}
							options={categoryOptions}
							placeholder="Select Category"
							error={step0Errors.category}
						/>
						<FormCreatableSelect
							label="Domain"
							required
							allowCreate
							loading={domainsQuery.isFetching}
							value={domain || undefined}
							onChange={(v) => {
								const next = String(v ?? "");
								setDomain(next);
								setAgreementType("");
								setAgreementSubtype("");
								if (step0Errors.domain) setStep0Errors((s) => ({ ...s, domain: undefined }));
							}}
							options={domainOptions}
							placeholder="Select Domain"
							error={step0Errors.domain}
						/>
						<FormCreatableSelect
							label="Agreement Type"
							required
							allowCreate
							loading={typesQuery.isFetching}
							value={agreementType || undefined}
							onChange={(v) => {
								const next = String(v ?? "");
								setAgreementType(next);
								setAgreementSubtype("");
								if (step0Errors.agreementType) setStep0Errors((s) => ({ ...s, agreementType: undefined }));
							}}
							options={typeOptions}
							placeholder="Select Agreement Type"
							error={step0Errors.agreementType}
						/>
						<FormCreatableSelect
							label="Agreement Subtype"
							required
							allowCreate
							loading={subtypesQuery.isFetching}
							value={agreementSubtype || undefined}
							onChange={(v) => {
								setAgreementSubtype(String(v ?? ""));
								if (step0Errors.agreementSubtype)
									setStep0Errors((s) => ({ ...s, agreementSubtype: undefined }));
							}}
							options={subtypeOptions}
							placeholder="Select Sub-type"
							error={step0Errors.agreementSubtype}
						/>
					</div>
				)}

				{activeStep === 1 && (
					<div className="flex flex-col gap-5">
						{stepsQuery.isError && (
							<p className="text-sm text-error-500">
								{formatUserFacingError(stepsQuery.error, "Could not load agreement steps.")}{" "}
								<button
									type="button"
									className="font-medium text-primary-600 underline dark:text-primary-400"
									onClick={() => void stepsQuery.refetch()}
								>
									Retry
								</button>
							</p>
						)}
						<FormToggleField
							label="Additional Steps"
							checked={additionalStepsEnabled}
							onChange={setAdditionalStepsEnabled}
						/>
						{additionalStepsEnabled && (
							<FormSelect
								label="Add Step"
								required
								mode="multiple"
								allowClear
								showSearch
								optionFilterProp="label"
								loading={stepsQuery.isFetching}
								value={selectedStepIds}
								onChange={(v) => setSelectedStepIds(v as string[])}
								options={stepOptions}
								placeholder="Select"
								className="w-full min-w-0"
							/>
						)}
					</div>
				)}
			</div>
		</Modal>
	);
};
