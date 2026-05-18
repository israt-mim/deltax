import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCenter,
	pointerWithin,
	useDroppable,
	useSensor,
	useSensors,
	type CollisionDetection,
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
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
import {
	applyFieldDragEnd,
	applyFieldDragOver,
	fieldSortableId,
	parseFieldSortableId,
	parseSectionDropId,
	parseSectionSortableId,
	reorderSections,
	sectionDropId,
	sectionSortableId,
} from "./agreementLayoutDnD";

/** Prefer field / section-drop targets so cross-section moves register correctly. */
const layoutCollisionDetection: CollisionDetection = (args) => {
	const pointerCollisions = pointerWithin(args);
	if (pointerCollisions.length > 0) {
		const fieldOrDrop = pointerCollisions.find((collision) => {
			const id = String(collision.id);
			return id.startsWith("field:") || id.startsWith("section-drop:");
		});
		if (fieldOrDrop) return [fieldOrDrop];

		const sectionHeader = pointerCollisions.find((collision) =>
			String(collision.id).startsWith("section:")
		);
		if (sectionHeader) return [sectionHeader];
	}
	return closestCenter(args);
};
import type { ConfigureFieldOverrides } from "./buildConfigureAgreementPayload";
import { EditFieldModal } from "../fieldConfiguration/EditFieldModal";

export type DisplaySectionRow = { key: string; name: string; fields: string[] };

export function mergeSectionFieldIds(section: DisplaySectionRow, overrides: ConfigureFieldOverrides): string[] {
	const removed = new Set(overrides.removedFieldIdBySectionKey[section.key] ?? []);
	const base = (section.fields ?? []).filter((fid) => !removed.has(fid));
	const added = overrides.addedBySectionKey[section.key] ?? [];
	const merged = [...new Set([...base, ...added])];
	const order = overrides.fieldOrderBySectionKey?.[section.key];
	if (!order?.length) return merged;

	const mergedSet = new Set(merged);
	const ordered = order.filter((fid) => mergedSet.has(fid));
	const tail = merged.filter((fid) => !order.includes(fid));
	return [...ordered, ...tail];
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
	dragHandleRef,
	dragHandleProps,
	isDragging,
	onEdit,
	onRemove,
}: {
	fieldId: string;
	doc: FieldConfigurationApiDocument | undefined;
	loading: boolean;
	readOnly?: boolean;
	dragHandleRef?: (element: HTMLButtonElement | null) => void;
	dragHandleProps?: Omit<HTMLAttributes<HTMLButtonElement>, "ref">;
	isDragging?: boolean;
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
				"dark:border-black-500 dark:bg-black-800 dark:hover:border-primary-600/40 dark:hover:bg-black-750",
				isDragging && "opacity-40"
			)}
		>
			{readOnly ? (
				<DragIndicatorOutlinedIcon
					sx={{ fontSize: 20 }}
					className="shrink-0 text-neutral-300 dark:text-neutral-600"
					aria-hidden
				/>
			) : (
				<button
					type="button"
					ref={dragHandleRef}
					className="shrink-0 cursor-grab rounded p-0.5 text-neutral-400 hover:text-neutral-600 active:cursor-grabbing dark:text-neutral-500 dark:hover:text-neutral-300"
					aria-label="Drag field"
					{...dragHandleProps}
				>
					<DragIndicatorOutlinedIcon sx={{ fontSize: 20 }} aria-hidden />
				</button>
			)}
			<div className={cn("min-w-0 flex-1 leading-tight", showActions && "pr-14")}>
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
						"absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-1 rounded-md p-1",
						"opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
					)}
				>
					{onEdit ? (
						<button
							type="button"
							aria-label="Edit field"
							className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-black-600 dark:hover:text-neutral-100"
							onClick={onEdit}
						>
							<EditOutlinedIcon sx={{ fontSize: 15 }} />
						</button>
					) : null}
					{onRemove ? (
						<button
							type="button"
							aria-label="Remove field"
							className="rounded-md p-1 text-neutral-500 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-950/40 dark:hover:text-error-400"
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
	onSectionsChange?: (sections: DisplaySectionRow[]) => void;
	onOpenAddSection?: () => void;
	onOpenAddField?: (sectionKey: string) => void;
	onRemoveFieldFromSection?: (sectionKey: string, fieldId: string) => void;
	onRenameSection?: (sectionKey: string, name: string) => void;
}

function SortableFieldTile({
	sectionKey,
	fieldId,
	doc,
	loading,
	readOnly,
	onEdit,
	onRemove,
}: {
	sectionKey: string;
	fieldId: string;
	doc: FieldConfigurationApiDocument | undefined;
	loading: boolean;
	readOnly?: boolean;
	onEdit?: () => void;
	onRemove?: () => void;
}) {
	const id = fieldSortableId(sectionKey, fieldId);
	const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
		useSortable({ id, disabled: readOnly });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} className="min-w-0">
			<FieldTile
				fieldId={fieldId}
				doc={doc}
				loading={loading}
				readOnly={readOnly}
				isDragging={isDragging}
				dragHandleRef={setActivatorNodeRef}
				dragHandleProps={{ ...attributes, ...listeners }}
				onEdit={onEdit}
				onRemove={onRemove}
			/>
		</div>
	);
}

function SectionFieldsDropZone({ sectionKey, children }: { sectionKey: string; children: React.ReactNode }) {
	const { setNodeRef, isOver } = useDroppable({ id: sectionDropId(sectionKey) });
	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex min-h-12 min-w-0 flex-col gap-2 rounded-md transition-colors",
				isOver && "bg-primary-50/60 ring-1 ring-primary-200 dark:bg-primary-950/20 dark:ring-primary-800/50"
			)}
		>
			{children}
		</div>
	);
}

function SortableSectionBlock({
	section,
	expanded,
	isEditingTitle,
	editingSectionName,
	readOnly,
	fieldIds,
	fieldQueries,
	onToggleCollapsed,
	onStartRename,
	onCommitRename,
	onCancelRename,
	onEditingNameChange,
	onOpenAddField,
	onRemoveFieldFromSection,
	onEditField,
	canRenameSection,
	sectionDragDisabled,
}: {
	section: DisplaySectionRow;
	expanded: boolean;
	isEditingTitle: boolean;
	editingSectionName: string;
	readOnly?: boolean;
	canRenameSection?: boolean;
	sectionDragDisabled?: boolean;
	fieldIds: string[];
	fieldQueries: UseQueryResult<FieldConfigurationApiDocument, Error>[];
	onToggleCollapsed: () => void;
	onStartRename: () => void;
	onCommitRename: () => void;
	onCancelRename: () => void;
	onEditingNameChange: (name: string) => void;
	onOpenAddField?: () => void;
	onRemoveFieldFromSection?: (fieldId: string) => void;
	onEditField?: (fieldId: string) => void;
}) {
	const sectionId = sectionSortableId(section.key);
	const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
		useSortable({ id: sectionId, disabled: readOnly || sectionDragDisabled });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const fieldSortableIds = (section.fields ?? []).map((fid) => fieldSortableId(section.key, fid));

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"flex w-full min-w-0 flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-black-500",
				isDragging && "opacity-60"
			)}
		>
			<div className="flex items-center justify-between gap-2 bg-neutral-100 px-3 py-2.5 dark:bg-black-600">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					{readOnly ? (
						<DragIndicatorOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 text-neutral-400" />
					) : (
						<button
							type="button"
							ref={setActivatorNodeRef}
							className="shrink-0 cursor-grab rounded p-0.5 text-neutral-400 hover:text-neutral-600 active:cursor-grabbing dark:text-neutral-500"
							aria-label="Drag section"
							{...attributes}
							{...listeners}
						>
							<DragIndicatorOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />
						</button>
					)}
					{isEditingTitle ? (
						<FormInput
							className="min-w-0 flex-1"
							value={editingSectionName}
							autoFocus
							onChange={(e) => onEditingNameChange(e.target.value)}
							onBlur={onCommitRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									onCommitRename();
								}
								if (e.key === "Escape") {
									e.preventDefault();
									onCancelRename();
								}
							}}
						/>
					) : (
						<span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
							{section.name}
						</span>
					)}
					{!readOnly && canRenameSection && !isEditingTitle ? (
						<button
							type="button"
							aria-label="Edit section name"
							className="shrink-0 rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-800 dark:hover:bg-black-500 dark:hover:text-neutral-100"
							onClick={onStartRename}
						>
							<EditOutlinedIcon sx={{ fontSize: 18 }} />
						</button>
					) : null}
				</div>
				<button
					type="button"
					aria-expanded={expanded}
					className="shrink-0 rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-200/60 dark:hover:bg-black-500"
					onClick={onToggleCollapsed}
				>
					<ExpandMoreOutlinedIcon
						sx={{ fontSize: 22 }}
						className={cn("transition-transform", expanded ? "rotate-180" : "rotate-0")}
					/>
				</button>
			</div>
			{expanded ? (
				<div className="border-t border-neutral-200 bg-neutral-50/50 px-3 py-2.5 dark:border-black-500 dark:bg-black-900/30">
					<SectionFieldsDropZone sectionKey={section.key}>
						<SortableContext id={section.key} items={fieldSortableIds} strategy={rectSortingStrategy}>
							<div className="grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-2">
								{(section.fields ?? []).map((fid) => {
									const idx = fieldIds.indexOf(fid);
									const q = idx >= 0 ? fieldQueries[idx] : undefined;
									return (
										<SortableFieldTile
											key={fieldSortableId(section.key, fid)}
											sectionKey={section.key}
											fieldId={fid}
											doc={q?.data}
											loading={Boolean(q?.isPending || q?.isFetching)}
											readOnly={readOnly}
											onEdit={readOnly || !onEditField ? undefined : () => onEditField(fid)}
											onRemove={
												readOnly || !onRemoveFieldFromSection
													? undefined
													: () => onRemoveFieldFromSection(fid)
											}
										/>
									);
								})}
							</div>
						</SortableContext>
						{!readOnly && onOpenAddField ? (
							<Button
								type="button"
								size="sm"
								appearance="outlined"
								status="primary"
								className="mx-auto mt-2"
								onClick={onOpenAddField}
							>
								<AddOutlinedIcon sx={{ fontSize: 16 }} />
								Add Field
							</Button>
						) : null}
					</SectionFieldsDropZone>
				</div>
			) : null}
		</div>
	);
}

export function AgreementStepLayoutPanel({
	readOnly = false,
	displaySections,
	onSectionsChange,
	onOpenAddSection,
	onOpenAddField,
	onRemoveFieldFromSection,
	onRenameSection,
}: AgreementStepLayoutPanelProps) {
	const [sections, setSections] = useState(displaySections);
	const [activeDragId, setActiveDragId] = useState<string | null>(null);
	const draggingFieldIdRef = useRef<string | null>(null);
	const [collapsedByKey, setCollapsedByKey] = useState<Record<string, boolean>>({});
	const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
	const [editingSectionName, setEditingSectionName] = useState("");
	const [editFieldId, setEditFieldId] = useState<string | null>(null);

	const dragEnabled = !readOnly && Boolean(onSectionsChange);

	useEffect(() => {
		setSections(displaySections);
	}, [displaySections]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 6 },
		})
	);

	const fieldIds = useMemo(() => {
		const ids = sections.flatMap((s) => s.fields ?? []);
		return [...new Set(ids.filter(Boolean))];
	}, [sections]);

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

	const commitSections = (next: DisplaySectionRow[]) => {
		setSections(next);
		onSectionsChange?.(next);
	};

	const handleDragStart = (event: DragStartEvent) => {
		const activeId = String(event.active.id);
		setActiveDragId(activeId);
		const activeField = parseFieldSortableId(activeId);
		draggingFieldIdRef.current = activeField?.fieldId ?? null;
	};

	const handleDragOver = (event: DragOverEvent) => {
		const fieldId = draggingFieldIdRef.current;
		if (!fieldId) return;

		const { over } = event;
		if (!over) return;

		const overId = String(over.id);
		const overSectionKey =
			parseFieldSortableId(overId)?.sectionKey ??
			parseSectionDropId(overId) ??
			parseSectionSortableId(overId);
		if (overSectionKey) {
			setCollapsedByKey((prev) =>
				prev[overSectionKey] ? { ...prev, [overSectionKey]: false } : prev
			);
		}

		setSections((prev) => {
			const next = applyFieldDragOver(prev, fieldId, overId);
			return next ?? prev;
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const fieldId = draggingFieldIdRef.current;
		setActiveDragId(null);
		draggingFieldIdRef.current = null;

		const { active, over } = event;
		const activeId = String(active.id);

		if (fieldId) {
			setSections((prev) => {
				const overId = over ? String(over.id) : null;
				const next =
					overId && activeId !== overId
						? (applyFieldDragEnd(prev, fieldId, overId) ?? prev)
						: prev;
				onSectionsChange?.(next);
				return next;
			});
			return;
		}

		if (!over || active.id === over.id) {
			onSectionsChange?.(sections);
			return;
		}

		const overId = String(over.id);
		const activeSectionKey = parseSectionSortableId(activeId);
		if (!activeSectionKey) {
			onSectionsChange?.(sections);
			return;
		}

		const overSectionKey =
			parseSectionSortableId(overId) ??
			parseFieldSortableId(overId)?.sectionKey ??
			parseSectionDropId(overId) ??
			null;
		if (!overSectionKey || activeSectionKey === overSectionKey) {
			onSectionsChange?.(sections);
			return;
		}

		const next = reorderSections(sections, activeSectionKey, overSectionKey);
		commitSections(next);
	};

	const isFieldDragActive = Boolean(activeDragId && parseFieldSortableId(activeDragId));

	const sectionSortableIds = sections.map((s) => sectionSortableId(s.key));

	const activeFieldDrag = activeDragId ? parseFieldSortableId(activeDragId) : null;
	const activeFieldDoc = activeFieldDrag
		? fieldQueries[fieldIds.indexOf(activeFieldDrag.fieldId)]?.data
		: undefined;

	const editFieldModal = (
		<EditFieldModal
			open={editFieldId != null}
			fieldId={editFieldId}
			onClose={() => setEditFieldId(null)}
		/>
	);

	if (sections.length === 0) {
		return (
			<>
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
			{editFieldModal}
			</>
		);
	}

	const sectionList = (
		<div className="flex w-full min-w-0 max-w-full flex-col gap-4">
			{sections.map((section) => (
				<SortableSectionBlock
					key={section.key}
					section={section}
					expanded={!collapsedByKey[section.key]}
					isEditingTitle={editingSectionKey === section.key}
					editingSectionName={editingSectionName}
					readOnly={readOnly || !dragEnabled}
					canRenameSection={Boolean(onRenameSection)}
					sectionDragDisabled={isFieldDragActive}
					fieldIds={fieldIds}
					fieldQueries={fieldQueries}
					onToggleCollapsed={() => toggleCollapsed(section.key)}
					onStartRename={() => startRename(section)}
					onCommitRename={() => commitRename(section.key)}
					onCancelRename={cancelRename}
					onEditingNameChange={setEditingSectionName}
					onOpenAddField={onOpenAddField ? () => onOpenAddField(section.key) : undefined}
					onRemoveFieldFromSection={
						onRemoveFieldFromSection
							? (fieldId) => onRemoveFieldFromSection(section.key, fieldId)
							: undefined
					}
					onEditField={readOnly ? undefined : (fieldId) => setEditFieldId(fieldId)}
				/>
			))}
			{!readOnly && onOpenAddSection ? (
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
			) : null}
		</div>
	);

	if (!dragEnabled) {
		return (
			<>
				{sectionList}
				{editFieldModal}
			</>
		);
	}

	return (
		<>
		<DndContext
			sensors={sensors}
			collisionDetection={layoutCollisionDetection}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<SortableContext items={sectionSortableIds} strategy={verticalListSortingStrategy}>
				{sectionList}
			</SortableContext>
			<DragOverlay dropAnimation={null}>
				{activeFieldDrag ? (
					<div className="min-w-[260px] max-w-[340px] shadow-lg">
						<FieldTile fieldId={activeFieldDrag.fieldId} doc={activeFieldDoc} loading={false} readOnly />
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
		{editFieldModal}
		</>
	);
}
