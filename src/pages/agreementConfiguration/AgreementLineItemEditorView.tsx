import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import type { AgreementStepDetailsData } from "../../api";
import { Button } from "../../components/base/Button";
import { PageLoader } from "../../components/base/PageLoader";
import { AgreementStepDetailsForm } from "./AgreementStepDetailsForm";
import { buildInitialFieldValues, validateRequiredAgreementFields } from "./agreementStepDetailsValidation";

export interface AgreementLineItemEditorViewProps {
	details: AgreementStepDetailsData | null;
	mode: "create" | "edit";
	initialValuesByFieldId: Record<string, unknown>;
	onCancel: () => void;
	onSave: (values: Record<string, unknown>) => void | Promise<void>;
	savePending?: boolean;
}

export function AgreementLineItemEditorView({
	details,
	mode,
	initialValuesByFieldId,
	onCancel,
	onSave,
	savePending = false,
}: AgreementLineItemEditorViewProps) {
	const mergedInitial = useMemo(() => {
		if (!details?.sections?.length) return { ...initialValuesByFieldId };
		return { ...buildInitialFieldValues(details), ...initialValuesByFieldId };
	}, [details, initialValuesByFieldId]);

	const [draft, setDraft] = useState(mergedInitial);
	const [errorsByFieldId, setErrorsByFieldId] = useState<Record<string, string>>({});

	useEffect(() => {
		setDraft(mergedInitial);
		setErrorsByFieldId({});
	}, [mergedInitial]);

	const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
		setDraft((prev) => ({ ...prev, [fieldId]: value }));
		setErrorsByFieldId((prev) => {
			if (!prev[fieldId]) return prev;
			const next = { ...prev };
			delete next[fieldId];
			return next;
		});
	}, []);

	const handleSave = useCallback(async () => {
		if (!details?.sections?.length) {
			await Promise.resolve(onSave(draft));
			return;
		}
		const merged = { ...buildInitialFieldValues(details), ...draft };
		const { ok, missingLabels, missingFieldIds } = validateRequiredAgreementFields(details, merged);
		if (!ok) {
			setErrorsByFieldId(Object.fromEntries(missingFieldIds.map((fieldId) => [fieldId, "This is required"])));
			const list = missingLabels.slice(0, 6).join(", ");
			const more = missingLabels.length > 6 ? ` (+${missingLabels.length - 6} more)` : "";
			toast.error(`Fill all required fields: ${list}${more}.`);
			return;
		}
		setErrorsByFieldId({});
		await Promise.resolve(onSave(merged));
	}, [details, draft, onSave]);

	if (!details?.sections?.length) {
		return (
			<div className="flex min-h-[200px] items-center justify-center py-8">
				<PageLoader mode="embedded" />
			</div>
		);
	}

	const title = mode === "create" ? "New Line Item" : "Edit Line Item";

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-black-600">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<button
						type="button"
						aria-label="Back to line items"
						className="flex shrink-0 rounded-md p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-black-600"
						onClick={onCancel}
					>
						<ArrowBackOutlinedIcon sx={{ fontSize: 22 }} />
					</button>
					<h2 className="truncate text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						onClick={onCancel}
						disabled={savePending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="md"
						appearance="filled"
						status="primary"
						loading={savePending}
						disabled={savePending}
						onClick={() => void handleSave()}
					>
						{mode === "create" ? "Add" : "Save"}
					</Button>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-auto rounded-lg bg-neutral-50/50 px-1 py-2 dark:bg-black-900/30">
				<AgreementStepDetailsForm
					details={details}
					loading={false}
					errorMessage={null}
					valuesByFieldId={draft}
					errorsByFieldId={errorsByFieldId}
					onFieldValueChange={handleFieldChange}
				/>
			</div>
		</div>
	);
}
