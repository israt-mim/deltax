import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import cn from "classnames";
import type { AgreementStepDetailsData, AgreementStepDetailsField } from "../../api";
import { filterTagsForDisplay } from "./agreementStepDetailsValidation";
import { FormDatePicker } from "../../components/form-input/FormDatePicker";
import { FormInput } from "../../components/form-input/FormInput";
import { FormNumber } from "../../components/form-input/FormNumber";
import { FormSelect } from "../../components/form-input/FormSelect";
import { FormSwitch } from "../../components/form-input/FormSwitch";
import { Typography } from "../../components/base/Typography";

function normalizeChoiceOptions(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((x) => (typeof x === "string" ? x : String(x)));
}

function toDayjsOrNull(v: unknown): Dayjs | null {
	if (v == null || v === "") return null;
	if (dayjs.isDayjs(v)) return v;
	const d = dayjs(String(v));
	return d.isValid() ? d : null;
}

function formatFieldDisplayValue(field: AgreementStepDetailsField, value: unknown): string {
	if (value == null || value === "") return "—";
	const dataType = (field.dataType ?? "String").trim();
	if (dataType === "Boolean") return Boolean(value) ? "Yes" : "No";
	if (dataType === "Date") {
		const d = dayjs(String(value));
		return d.isValid() ? d.format("MMM D, YYYY") : String(value);
	}
	if (dataType === "DateTime") {
		const d = dayjs(String(value));
		return d.isValid() ? d.format("MMM D, YYYY h:mm A") : String(value);
	}
	if (dataType === "Currency") {
		const num = Number(value);
		return Number.isFinite(num)
			? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num)
			: String(value);
	}
	return String(value);
}

function AgreementStepFieldView({
	field,
	value,
}: {
	field: AgreementStepDetailsField;
	value: unknown;
}) {
	const displayValue = formatFieldDisplayValue(field, value);
	const helperText = field.tooltip?.trim() || undefined;

	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
				<span className="inline-flex flex-wrap items-center gap-1.5">
					<span>{field.name}</span>
					{field.required ? <span className="text-error-500">*</span> : null}
					{filterTagsForDisplay(field.tags).map((t) => (
						<span
							key={t}
							className="rounded bg-warning-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-800 dark:bg-warning-900/80 dark:text-warning-200"
						>
							{t}
						</span>
					))}
				</span>
			</span>
			<span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{displayValue}</span>
			{helperText ? (
				<span className="text-xs text-neutral-400 dark:text-neutral-500">{helperText}</span>
			) : null}
		</div>
	);
}

function AgreementStepFieldControl({
	field,
	value,
	error,
	readOnly,
	onChange,
}: {
	field: AgreementStepDetailsField;
	value: unknown;
	error?: string;
	readOnly?: boolean;
	onChange: (next: unknown) => void;
}) {
	if (readOnly) {
		return <AgreementStepFieldView field={field} value={value} />;
	}

	const disabled = Boolean(field.disabled || field.locked);
	const dataType = (field.dataType ?? "String").trim();
	const label = (
		<span className="inline-flex flex-wrap items-center gap-2">
			<span>{field.name}</span>
			{filterTagsForDisplay(field.tags).map((t) => (
				<span
					key={t}
					className="rounded bg-warning-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-800 dark:bg-warning-900/80 dark:text-warning-200"
				>
					{t}
				</span>
			))}
		</span>
	);

	const placeholder = field.name;
	const helperText = field.tooltip?.trim() || undefined;
	const required = Boolean(field.required);

	if (dataType === "Boolean") {
		return (
			<FormSwitch
				label={label}
				required={required}
				helperText={helperText}
				checked={Boolean(value)}
				disabled={disabled}
				onChange={(v) => onChange(v)}
			/>
		);
	}

	if (dataType === "Choice" || normalizeChoiceOptions(field.choiceOptions).length > 0) {
		const opts = normalizeChoiceOptions(field.choiceOptions);
		return (
			<FormSelect
				label={label}
				required={required}
				helperText={helperText}
				error={error}
				placeholder={placeholder}
				disabled={disabled}
				allowClear
				options={opts.map((o) => ({ value: o, label: o }))}
				value={value == null || value === "" ? undefined : String(value)}
				onChange={(v) => onChange(v ?? null)}
			/>
		);
	}

	if (dataType === "Date" || dataType === "DateTime") {
		const showTime = dataType === "DateTime";
		return (
			<FormDatePicker
				label={label}
				required={required}
				helperText={helperText}
				error={error}
				disabled={disabled}
				className="w-full"
				style={{ width: "100%" }}
				showTime={showTime ? { format: "HH:mm" } : false}
				value={toDayjsOrNull(value)}
				onChange={(d) => {
					if (d == null || Array.isArray(d)) {
						onChange(null);
						return;
					}
					onChange(showTime ? d.toISOString() : d.format("YYYY-MM-DD"));
				}}
			/>
		);
	}

	if (dataType === "Currency") {
		const num = value == null || value === "" ? null : Number(value);
		return (
			<FormNumber
				label={label}
				required={required}
				helperText={helperText}
				error={error}
				disabled={disabled}
				className="w-full"
				min={0}
				precision={2}
				prefix="$"
				placeholder="0.00"
				value={Number.isFinite(num as number) ? (num as number) : null}
				onChange={(v) => onChange(v ?? null)}
			/>
		);
	}

	if (dataType === "Number" || dataType === "Integer" || dataType === "Decimal") {
		const num = value == null || value === "" ? null : Number(value);
		return (
			<FormNumber
				label={label}
				required={required}
				helperText={helperText}
				error={error}
				disabled={disabled}
				className="w-full"
				placeholder={placeholder}
				value={Number.isFinite(num as number) ? (num as number) : null}
				onChange={(v) => onChange(v ?? null)}
			/>
		);
	}

	return (
		<FormInput
			label={label}
			required={required}
			helperText={helperText}
			error={error}
			placeholder={placeholder}
			disabled={disabled}
			value={value == null ? "" : String(value)}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}

export interface AgreementStepDetailsFormProps {
	details: AgreementStepDetailsData | null;
	loading: boolean;
	errorMessage: string | null;
	valuesByFieldId: Record<string, unknown>;
	errorsByFieldId?: Record<string, string>;
	/** When true, fields are disabled (view mode). */
	readOnly?: boolean;
	onFieldValueChange: (fieldId: string, value: unknown) => void;
}

/**
 * Renders sections + flattened fields from GET /api/agreements/:id/details (create / runtime agreement flow).
 */
export function AgreementStepDetailsForm({
	details,
	loading,
	errorMessage,
	valuesByFieldId,
	errorsByFieldId,
	readOnly = false,
	onFieldValueChange,
}: AgreementStepDetailsFormProps) {
	const [collapsedByKey, setCollapsedByKey] = useState<Record<string, boolean>>({});

	const sectionKeys = useMemo(() => {
		if (!details?.sections?.length) return [];
		return details.sections.map((s, i) => `sec-${i}-${(s.name ?? "").slice(0, 48)}`);
	}, [details?.sections]);

	useEffect(() => {
		const errorIds = new Set(Object.keys(errorsByFieldId ?? {}));
		if (!errorIds.size || !details?.sections?.length) return;

		setCollapsedByKey((prev) => {
			let changed = false;
			const next = { ...prev };
			details.sections.forEach((section, i) => {
				if (!(section.fields ?? []).some((field) => errorIds.has(field.id))) return;
				const key = sectionKeys[i] ?? `sec-${i}`;
				if (next[key]) {
					next[key] = false;
					changed = true;
				}
			});
			return changed ? next : prev;
		});
	}, [details?.sections, errorsByFieldId, sectionKeys]);

	const toggleSection = useCallback((key: string) => {
		setCollapsedByKey((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	if (loading) {
		return (
			<div className="flex flex-col gap-3 py-6">
				{[0, 1, 2].map((i) => (
					<div key={i} className="h-10 animate-pulse rounded-md bg-neutral-100 dark:bg-black-600" />
				))}
			</div>
		);
	}

	if (errorMessage) {
		return (
			<Typography size="small" className="text-error-600 dark:text-error-400">
				{errorMessage}
			</Typography>
		);
	}

	if (!details || !details.sections?.length) {
		return (
			<p className="text-sm text-neutral-500 dark:text-neutral-400">
				No sections are configured for this step in the matching agreement configuration.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{details.sections.map((section, si) => {
				const key = sectionKeys[si] ?? `sec-${si}`;
				const expanded = !collapsedByKey[key];
				const visibleFields = (section.fields ?? []).filter((f) => f.visible !== false);

				return (
					<div
						key={key}
						className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50/80 dark:border-black-600 dark:bg-black-800/40"
					>
						<div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-100/90 px-3 py-2.5 dark:border-black-600 dark:bg-black-800/80">
							<span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
								{section.name?.trim() || "Section"}
							</span>
							<button
								type="button"
								aria-expanded={expanded}
								className="shrink-0 rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-200/60 dark:hover:bg-black-500"
								onClick={() => toggleSection(key)}
							>
								<ExpandMoreOutlinedIcon
									sx={{ fontSize: 22 }}
									className={cn("transition-transform", expanded ? "rotate-180" : "rotate-0")}
								/>
							</button>
						</div>
						{expanded ? (
							<div className="border-t border-neutral-200 bg-white px-3 py-4 dark:border-black-600 dark:bg-black-800">
								{visibleFields.length === 0 ? (
									<p className="text-sm text-neutral-500 dark:text-neutral-400">No visible fields in this section.</p>
								) : (
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{visibleFields.map((field) => (
											<AgreementStepFieldControl
												key={field.id}
												field={field}
												value={valuesByFieldId[field.id]}
												error={errorsByFieldId?.[field.id]}
												readOnly={readOnly}
												onChange={(next) => onFieldValueChange(field.id, next)}
											/>
										))}
									</div>
								)}
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
