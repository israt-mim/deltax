import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import { DocEditor } from "../editor";
import { Button } from "../components/base/Button";
import { useTemplateDetailQuery, useUpdateTemplateMutation } from "../api/hooks/templates";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";

const AUTOSAVE_DELAY_MS = 1500;

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function TemplateEditorPage() {
	const { id = "" } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const templateQuery = useTemplateDetailQuery({ id });
	const updateMutation = useUpdateTemplateMutation();

	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

	const latestHtmlRef = useRef<string>("");
	const latestJsonRef = useRef<Record<string, unknown>>({});
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isDirtyRef = useRef(false);

	const template = templateQuery.data;

	usePageBreadcrumb([
		crumb("Configure", "/configure"),
		crumb("Templates", "/configure/templates"),
		crumb(template?.name ?? "Editor", `/configure/templates/${id}/edit`),
	]);

	const doSave = useCallback(async () => {
		if (!id || !isDirtyRef.current) return;
		isDirtyRef.current = false;
		setSaveStatus("saving");
		try {
			await updateMutation.mutateAsync({
				id,
				body: { content: latestHtmlRef.current ? latestJsonRef.current : "", content_html: latestHtmlRef.current },
			});
			setSaveStatus("saved");
			if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
			savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
		} catch (e) {
			isDirtyRef.current = true;
			setSaveStatus("error");
			toast.error(formatUserFacingError(e, "Could not save template."));
		}
	}, [id, updateMutation]);

	const scheduleAutoSave = useCallback(() => {
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		setSaveStatus("idle");
		saveTimerRef.current = setTimeout(() => void doSave(), AUTOSAVE_DELAY_MS);
	}, [doSave]);

	const handleContentChange = useCallback(
		(html: string, json: Record<string, unknown>) => {
			latestHtmlRef.current = html;
			latestJsonRef.current = json;
			isDirtyRef.current = true;
			scheduleAutoSave();
		},
		[scheduleAutoSave],
	);

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
			if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
		};
	}, []);

	const statusLabel = (() => {
		if (saveStatus === "saving") return "Saving…";
		if (saveStatus === "saved") return "Saved";
		if (saveStatus === "error") return "Save failed";
		return null;
	})();

	if (templateQuery.isError) {
		return (
			<div className="flex h-[calc(100vh-48px)] flex-col items-center justify-center gap-2">
				<p className="text-sm text-error-500">
					{formatUserFacingError(templateQuery.error, "Could not load template.")}
				</p>
				<Button size="md" status="secondary-neutral" onClick={() => void navigate("/configure/templates")}>
					Back to Templates
				</Button>
			</div>
		);
	}

	if (templateQuery.isPending) {
		return (
			<div className="flex h-[calc(100vh-48px)] items-center justify-center">
				<p className="text-sm text-neutral-400">Loading template…</p>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-48px)] flex-col overflow-hidden">
			<div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-900">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => void navigate("/configure/templates")}
						className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
					>
						<ArrowBackOutlinedIcon sx={{ fontSize: 18 }} />
						Templates
					</button>
					<span className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
					<span className="max-w-xs truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
						{template.name}
					</span>
				</div>

				{statusLabel && (
					<span
						className={[
							"text-xs",
							saveStatus === "saved"
								? "text-success-600 dark:text-success-400"
								: saveStatus === "error"
								? "text-error-500"
								: "text-neutral-400 dark:text-neutral-500",
						].join(" ")}
					>
						{statusLabel}
					</span>
				)}
			</div>

			<DocEditor
				initialContent={template.content_html ?? ""}
				onContentChange={handleContentChange}
				className="flex-1"
			/>
		</div>
	);
}
