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
import { Card } from "../../components/base/Card";
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

function fieldCardLabel(fieldId: string, doc: FieldConfigurationApiDocument | undefined): string {
	if (!doc?.details) return `Field ${fieldId.slice(0, 8)}…`;
	const name = doc.details.name?.trim() || "—";
	const tech = doc.details.groupTechnicalName?.trim() || fieldId;
	return `${name} (${tech})`;
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
	return (
		<Card className="group flex items-start gap-2 border border-neutral-200 bg-white px-3 py-3 shadow-sm dark:border-black-500 dark:bg-black-700">
			<DragIndicatorOutlinedIcon sx={{ fontSize: 18 }} className="mt-0.5 shrink-0 text-neutral-400" />
			<div className="min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
				{loading ? (
					<SkeletonInline />
				) : (
					fieldCardLabel(fieldId, doc)
				)}
			</div>
			{!readOnly && (onEdit || onRemove) && (
				<div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
					{onEdit && (
						<button
							type="button"
							aria-label="Edit field"
							className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-black-600 dark:hover:text-neutral-100"
							onClick={onEdit}
						>
							<EditOutlinedIcon sx={{ fontSize: 18 }} />
						</button>
					)}
					{onRemove && (
						<button
							type="button"
							aria-label="Remove field"
							className="rounded p-1 text-neutral-500 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950/40 dark:hover:text-error-400"
							onClick={onRemove}
						>
							<CloseOutlinedIcon sx={{ fontSize: 18 }} />
						</button>
					)}
				</div>
			)}
		</Card>
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
			<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 py-16 dark:border-black-500 dark:bg-black-800/40">
				<Typography size="medium" variant="semibold" className="text-neutral-700 dark:text-neutral-200">
					No layout for this step yet
				</Typography>
				{!readOnly && onOpenAddSection ? (
					<button
						type="button"
						className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-200 dark:hover:bg-primary-900/60"
						onClick={onOpenAddSection}
					>
						<AddOutlinedIcon sx={{ fontSize: 18 }} />
						New Section
					</button>
				) : (
					<p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
						Turn on Edit to add sections and fields.
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{displaySections.map((section) => {
				const expanded = !collapsedByKey[section.key];
				const isEditingTitle = editingSectionKey === section.key;
				return (
					<div
						key={section.key}
						className="flex flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-black-500"
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
							<div className="flex flex-col gap-3 border-t border-neutral-200 px-3 py-3 dark:border-black-500">
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
									<button
										type="button"
										className="mx-auto text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
										onClick={() => onOpenAddField(section.key)}
									>
										+ Add Field
									</button>
								)}
							</div>
						) : null}
					</div>
				);
			})}
			{!readOnly && onOpenAddSection && (
				<button
					type="button"
					className="mx-auto inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-200 dark:hover:bg-primary-900/60"
					onClick={onOpenAddSection}
				>
					<AddOutlinedIcon sx={{ fontSize: 18 }} />
					New Section
				</button>
			)}
		</div>
	);
}
