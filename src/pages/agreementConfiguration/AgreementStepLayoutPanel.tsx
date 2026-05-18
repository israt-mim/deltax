import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DragIndicatorOutlinedIcon from "@mui/icons-material/DragIndicatorOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import cn from "classnames";
import { getFieldById, type FieldConfigurationApiDocument } from "../../api";
import { queryKeys } from "../../api/queryKeys";
import { Button } from "../../components/base/Button";
import { SkeletonInline } from "../../components/skeletons";
import { Typography } from "../../components/base/Typography";
import { FormInput } from "../../components/form-input/FormInput";
import type { ConfigureFieldOverrides } from "./buildConfigureAgreementPayload";

export type DisplaySectionRow = { key: string; name: string; fields: string[] };

export function mergeSectionFieldIds(section: DisplaySectionRow, overrides: ConfigureFieldOverrides): string[] {
	const removed = new Set(overrides.removedFieldIdBySectionKey[section.key] ?? []);
	const base = (section.fields ?? []).filter((fid) => !removed.has(fid));
	const added = overrides.addedBySectionKey[section.key] ?? [];
	return [...new Set([...base, ...added])];
}

function getFieldCardMeta(
	fieldId: string,
	doc: FieldConfigurationApiDocument | undefined
): { name: string; technicalName: string } {
	if (!doc?.details) {
		return { name: `Field ${fieldId.slice(0, 8)}…`, technicalName: fieldId };
	}
	return {
		name: doc.details.name?.trim() || "—",
		technicalName: doc.details.groupTechnicalName?.trim() || fieldId,
	};
}

function FieldTile({
	fieldId,
	doc,
	loading,
	readOnly,
	onEdit,
	onRemove,
}: {
	fieldId: string;
	doc: FieldConfigurationApiDocument | undefined;
	loading: boolean;
	readOnly?: boolean;
	onEdit?: () => void;
	onRemove?: () => void;
}) {
	const meta = getFieldCardMeta(fieldId, doc);
	const showActions = !readOnly && (onEdit || onRemove);

	return (
		<article
			className={cn(
				"group relative flex min-w-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5",
				"transition-colors hover:border-primary-300 hover:bg-neutral-50",
				"dark:border-black-500 dark:bg-black-800 dark:hover:border-primary-600/40 dark:hover:bg-black-750"
			)}
		>
			<DragIndicatorOutlinedIcon
				sx={{ fontSize: 20 }}
				className="shrink-0 cursor-grab text-neutral-400 active:cursor-grabbing dark:text-neutral-500"
				aria-hidden
			/>
			<div className={cn("min-w-0 flex-1 leading-tight", showActions && "pr-12")}>
				{loading ? (
					<SkeletonInline className="h-3.5 w-28" />
				) : (
					<>
						<p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
							{meta.name}
						</p>
						<p
							className="truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400"
							title={meta.technicalName}
						>
							{meta.technicalName}
						</p>
					</>
				)}
			</div>
			{showActions ? (
				<div
					className={cn(
						"absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5 rounded p-0.5",
						"opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
					)}
				>
					{onEdit ? (
						<button
							type="button"
							aria-label="Edit field"
							className="rounded p-0.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-black-600 dark:hover:text-neutral-100"
							onClick={onEdit}
						>
							<EditOutlinedIcon sx={{ fontSize: 15 }} />
						</button>
					) : null}
					{onRemove ? (
						<button
							type="button"
							aria-label="Remove field"
							className="rounded p-0.5 text-neutral-500 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950/40 dark:hover:text-error-400"
							onClick={onRemove}
						>
							<CloseOutlinedIcon sx={{ fontSize: 15 }} />
						</button>
					) : null}
				</div>
			) : null}
		</article>
	);
}

export interface AgreementStepLayoutPanelProps {
	readOnly?: boolean;
	displaySections: DisplaySectionRow[];
	onOpenAddSection?: () => void;
	onOpenAddField?: (sectionKey: string) => void;
	onRemoveFieldFromSection?: (sectionKey: string, fieldId: string) => void;
	onRenameSection?: (sectionKey: string, name: string) => void;
}

export function AgreementStepLayoutPanel({
	readOnly = false,
	displaySections,
	onOpenAddSection,
	onOpenAddField,
	onRemoveFieldFromSection,
	onRenameSection,
}: AgreementStepLayoutPanelProps) {
	const [collapsedByKey, setCollapsedByKey] = useState<Record<string, boolean>>({});
	const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
	const [editingSectionName, setEditingSectionName] = useState("");

	const fieldIds = useMemo(() => {
		const ids = displaySections.flatMap((s) => s.fields ?? []);
		return [...new Set(ids.filter(Boolean))];
	}, [displaySections]);

	const fieldQueries = useQueries({
		queries: fieldIds.map((fid) => ({
			queryKey: [...queryKeys.fields.all, "detail", fid] as const,
			queryFn: () => getFieldById(fid),
			enabled: Boolean(fid),
			staleTime: 60_000,
		})),
	});

	const toggleCollapsed = (key: string) => {
		setCollapsedByKey((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const startRename = (section: DisplaySectionRow) => {
		if (readOnly || !onRenameSection) return;
		setEditingSectionKey(section.key);
		setEditingSectionName(section.name);
	};

	const commitRename = (sectionKey: string) => {
		const trimmed = editingSectionName.trim();
		if (trimmed.length === 0) {
			toast.error("Section name cannot be empty.");
			return;
		}
		onRenameSection?.(sectionKey, trimmed);
		setEditingSectionKey(null);
		setEditingSectionName("");
	};

	const cancelRename = () => {
		setEditingSectionKey(null);
		setEditingSectionName("");
	};

	if (displaySections.length === 0) {
		return (
			<div className="flex w-full min-w-0 max-w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 py-16 dark:border-black-500 dark:bg-black-800/40">
				<Typography size="medium" variant="semibold" className="text-neutral-700 dark:text-neutral-200">
					No layout for this step yet
				</Typography>
				{!readOnly && onOpenAddSection ? (
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="primary"
						onClick={onOpenAddSection}
					>
						<AddOutlinedIcon sx={{ fontSize: 18 }} />
						New Section
					</Button>
				) : (
					<p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
						Turn on Edit to add sections and fields.
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="flex w-full min-w-0 max-w-full flex-col gap-4">
			{displaySections.map((section) => {
				const expanded = !collapsedByKey[section.key];
				const isEditingTitle = editingSectionKey === section.key;
				return (
					<div
						key={section.key}
						className="flex w-full min-w-0 flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-black-500"
					>
						<div className="flex items-center justify-between gap-2 bg-neutral-100 px-3 py-2.5 dark:bg-black-600">
							<div className="flex min-w-0 flex-1 items-center gap-2">
								<DragIndicatorOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 text-neutral-400" />
								{isEditingTitle ? (
									<FormInput
										className="min-w-0 flex-1"
										value={editingSectionName}
										autoFocus
										onChange={(e) => setEditingSectionName(e.target.value)}
										onBlur={() => commitRename(section.key)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commitRename(section.key);
											}
											if (e.key === "Escape") {
												e.preventDefault();
												cancelRename();
											}
										}}
									/>
								) : (
									<span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
										{section.name}
									</span>
								)}
								{!readOnly && !isEditingTitle && onRenameSection && (
									<button
										type="button"
										aria-label="Edit section name"
										className="shrink-0 rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-800 dark:hover:bg-black-500 dark:hover:text-neutral-100"
										onClick={() => startRename(section)}
									>
										<EditOutlinedIcon sx={{ fontSize: 18 }} />
									</button>
								)}
							</div>
							<button
								type="button"
								aria-expanded={expanded}
								className="shrink-0 rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-200/60 dark:hover:bg-black-500"
								onClick={() => toggleCollapsed(section.key)}
							>
								<ExpandMoreOutlinedIcon
									sx={{ fontSize: 22 }}
									className={cn("transition-transform", expanded ? "rotate-180" : "rotate-0")}
								/>
							</button>
						</div>
						{expanded ? (
							<div className="flex min-w-0 flex-col gap-2 border-t border-neutral-200 bg-neutral-50/50 px-3 py-2.5 dark:border-black-500 dark:bg-black-900/30">
								<div className="grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-2">
									{(section.fields ?? []).map((fid) => {
										const idx = fieldIds.indexOf(fid);
										const q = idx >= 0 ? fieldQueries[idx] : undefined;
										return (
											<FieldTile
												key={`${section.key}-${fid}`}
												fieldId={fid}
												doc={q?.data}
												loading={Boolean(q?.isPending || q?.isFetching)}
												readOnly={readOnly}
												onEdit={
													readOnly
														? undefined
														: () => toast.info("Field editing opens from Fields configuration.")
												}
												onRemove={
													readOnly || !onRemoveFieldFromSection
														? undefined
														: () => onRemoveFieldFromSection(section.key, fid)
												}
											/>
										);
									})}
								</div>
								{!readOnly && onOpenAddField && (
									<Button
										type="button"
										size="sm"
										appearance="outlined"
										status="primary"
										className="mx-auto"
										onClick={() => onOpenAddField(section.key)}
									>
										<AddOutlinedIcon sx={{ fontSize: 16 }} />
										Add Field
									</Button>
								)}
							</div>
						) : null}
					</div>
				);
			})}
			{!readOnly && onOpenAddSection && (
				<Button
					type="button"
					size="md"
					appearance="outlined"
					status="primary"
					className="mx-auto"
					onClick={onOpenAddSection}
				>
					<AddOutlinedIcon sx={{ fontSize: 18 }} />
					New Section
				</Button>
			)}
		</div>
	);
}
