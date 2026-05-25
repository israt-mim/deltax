import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "react-toastify";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FullscreenOutlinedIcon from "@mui/icons-material/FullscreenOutlined";
import FullscreenExitOutlinedIcon from "@mui/icons-material/FullscreenExitOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { ResizableSidebar } from "../../components/base/ResizableSidebar";
import { DocEditor, type DocEditorHandle } from "../../editor";
import { useTemplateDetailQuery, useUpdateTemplateMutation } from "../../api/hooks/templates";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { printAsPdf } from "../../lib/printAsPdf";

const AUTOSAVE_DELAY_MS = 1500;

interface TemplateEditorSidebarProps {
	templateId: string | null;
	onClose: () => void;
	onWidthChange?: (width: number) => void;
	onFullscreenChange?: (fullscreen: boolean) => void;
}

export interface TemplateEditorSidebarHandle {
	insertVariable: (key: string) => void;
}

export const TemplateEditorSidebar = forwardRef<TemplateEditorSidebarHandle, TemplateEditorSidebarProps>(
	function TemplateEditorSidebar({ templateId, onClose, onWidthChange, onFullscreenChange }, ref) {
		const templateQuery = useTemplateDetailQuery({ id: templateId ?? undefined });
		const updateMutation = useUpdateTemplateMutation();

		const [isFullscreen, setIsFullscreen] = useState(false);

		const editorRef = useRef<DocEditorHandle>(null);
		const latestHtmlRef = useRef<string>("");
		const latestJsonRef = useRef<Record<string, unknown>>({});
		const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
		const isDirtyRef = useRef(false);

		const template = templateQuery.data;

		useImperativeHandle(ref, () => ({
			insertVariable: (key: string) => editorRef.current?.insertVariable(key),
		}));

		const doSave = useCallback(async () => {
			if (!templateId || !isDirtyRef.current) return;
			isDirtyRef.current = false;
			try {
				await updateMutation.mutateAsync({
					id: templateId,
					body: { content: latestHtmlRef.current ? latestJsonRef.current : "", content_html: latestHtmlRef.current },
				});
			} catch (e) {
				isDirtyRef.current = true;
				toast.error(formatUserFacingError(e, "Could not save template."));
			}
		}, [templateId, updateMutation]);

		const scheduleAutoSave = useCallback(() => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
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

		const handleClose = useCallback(async () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
			await doSave();
			latestHtmlRef.current = "";
			latestJsonRef.current = {};
			isDirtyRef.current = false;
			setIsFullscreen(false);
			onFullscreenChange?.(false);
			onClose();
		}, [doSave, onClose, onFullscreenChange]);

		const toggleFullscreen = useCallback(() => {
			setIsFullscreen((prev) => {
				onFullscreenChange?.(!prev);
				return !prev;
			});
		}, [onFullscreenChange]);

		// Clear timers when templateId changes or on unmount
		useEffect(() => {
			return () => {
				if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
			};
		}, [templateId]);

		if (!templateId) return null;

		const header = (
			<div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-3 py-2 dark:border-black-600 dark:bg-black-900">
				<div className="flex min-w-0 items-center gap-2">
					<button
						type="button"
						title="Close"
						onClick={() => void handleClose()}
						className="shrink-0 inline-flex items-center justify-center rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
					>
						<ArrowBackOutlinedIcon sx={{ fontSize: 18 }} />
					</button>
					<span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
						{template?.name ?? "Loading…"}
					</span>
				</div>

				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						title="Download as PDF"
						onClick={() => printAsPdf(template?.name ?? "Template", latestHtmlRef.current || (template?.content_html ?? ""))}
						className="inline-flex items-center justify-center rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
					>
						<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
					</button>

					<button
						type="button"
						title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
						onClick={toggleFullscreen}
						className="inline-flex items-center justify-center rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
					>
						{isFullscreen ? (
							<FullscreenExitOutlinedIcon sx={{ fontSize: 18 }} />
						) : (
							<FullscreenOutlinedIcon sx={{ fontSize: 18 }} />
						)}
					</button>

					{isFullscreen && (
						<button
							type="button"
							title="Close"
							onClick={() => void handleClose()}
							className="inline-flex items-center justify-center rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
						>
							<CloseOutlinedIcon sx={{ fontSize: 18 }} />
						</button>
					)}
				</div>
			</div>
		);

		const editorContent = templateQuery.isPending ? (
			<div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
				Loading template…
			</div>
		) : templateQuery.isError ? (
			<div className="flex flex-1 items-center justify-center text-sm text-error-500">
				{formatUserFacingError(templateQuery.error, "Could not load template.")}
			</div>
		) : (
			<DocEditor
				ref={editorRef}
				key={templateId}
				initialContent={template?.content_html ?? ""}
				onContentChange={handleContentChange}
				className="flex-1"
			/>
		);

		if (isFullscreen) {
			return (
				<div className="absolute inset-0 z-20 flex flex-col overflow-hidden border-l border-neutral-200 bg-white dark:border-black-600 dark:bg-black-800">
					{header}
					{editorContent}
				</div>
			);
		}

		return (
			<ResizableSidebar
				open
				onClose={() => void handleClose()}
				variant="page"
				defaultWidth={720}
				minWidth={480}
				maxWidth={1000}
				onWidthChange={onWidthChange}
			>
				{header}
				{editorContent}
			</ResizableSidebar>
		);
	}
);
