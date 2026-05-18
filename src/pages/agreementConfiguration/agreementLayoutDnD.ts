import { arrayMove } from "@dnd-kit/sortable";
import type { Dispatch, SetStateAction } from "react";
import type { DisplaySectionRow } from "./AgreementStepLayoutPanel";
import type { ConfigureDraftSection, ConfigureFieldOverrides } from "./buildConfigureAgreementPayload";

const SECTION_PREFIX = "section:";
const FIELD_PREFIX = "field:";
const SECTION_DROP_PREFIX = "section-drop:";

export function sectionSortableId(sectionKey: string): string {
	return `${SECTION_PREFIX}${sectionKey}`;
}

export function fieldSortableId(sectionKey: string, fieldId: string): string {
	return `${FIELD_PREFIX}${sectionKey}::${fieldId}`;
}

export function sectionDropId(sectionKey: string): string {
	return `${SECTION_DROP_PREFIX}${sectionKey}`;
}

export function parseSectionSortableId(id: string): string | null {
	return id.startsWith(SECTION_PREFIX) ? id.slice(SECTION_PREFIX.length) : null;
}

export function parseFieldSortableId(id: string): { sectionKey: string; fieldId: string } | null {
	if (!id.startsWith(FIELD_PREFIX)) return null;
	const rest = id.slice(FIELD_PREFIX.length);
	const sep = rest.indexOf("::");
	if (sep < 0) return null;
	return { sectionKey: rest.slice(0, sep), fieldId: rest.slice(sep + 2) };
}

export function parseSectionDropId(id: string): string | null {
	return id.startsWith(SECTION_DROP_PREFIX) ? id.slice(SECTION_DROP_PREFIX.length) : null;
}

export function reorderSections(
	sections: DisplaySectionRow[],
	activeSectionKey: string,
	overSectionKey: string
): DisplaySectionRow[] {
	const oldIndex = sections.findIndex((s) => s.key === activeSectionKey);
	const newIndex = sections.findIndex((s) => s.key === overSectionKey);
	if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return sections;
	return arrayMove(sections, oldIndex, newIndex);
}

export function reorderFieldsInSection(
	section: DisplaySectionRow,
	activeFieldId: string,
	overFieldId: string
): DisplaySectionRow {
	const oldIndex = section.fields.indexOf(activeFieldId);
	const newIndex = section.fields.indexOf(overFieldId);
	if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return section;
	return { ...section, fields: arrayMove(section.fields, oldIndex, newIndex) };
}

export function moveFieldBetweenSections(
	sections: DisplaySectionRow[],
	fieldId: string,
	fromSectionKey: string,
	toSectionKey: string,
	toIndex: number
): DisplaySectionRow[] {
	const next = sections.map((s) => ({ ...s, fields: [...s.fields] }));
	const from = next.find((s) => s.key === fromSectionKey);
	const to = next.find((s) => s.key === toSectionKey);
	if (!from || !to) return sections;

	const fromIndex = from.fields.indexOf(fieldId);
	if (fromIndex < 0) return sections;
	from.fields.splice(fromIndex, 1);

	let insertAt = Math.max(0, Math.min(toIndex, to.fields.length));
	if (fromSectionKey === toSectionKey && fromIndex < insertAt) {
		insertAt -= 1;
	}
	to.fields.splice(insertAt, 0, fieldId);
	return next;
}

export function resolveFieldDropTarget(overId: string): {
	sectionKey: string;
	fieldId?: string;
} | null {
	const overField = parseFieldSortableId(overId);
	if (overField) {
		return { sectionKey: overField.sectionKey, fieldId: overField.fieldId };
	}
	const dropKey = parseSectionDropId(overId) ?? parseSectionSortableId(overId);
	return dropKey ? { sectionKey: dropKey } : null;
}

function sectionsFieldLayoutEqual(a: DisplaySectionRow[], b: DisplaySectionRow[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((section, i) => {
		const other = b[i];
		if (section.key !== other.key) return false;
		if (section.fields.length !== other.fields.length) return false;
		return section.fields.every((fid, j) => fid === other.fields[j]);
	});
}

/** Resolve drag target for a field; uses the field's current section in `sections`. */
export function applyFieldDragEnd(
	sections: DisplaySectionRow[],
	activeFieldId: string,
	overId: string
): DisplaySectionRow[] | null {
	const fromSection = sections.find((s) => s.fields.includes(activeFieldId));
	if (!fromSection) return null;
	const fromSectionKey = fromSection.key;

	const target = resolveFieldDropTarget(overId);
	if (!target) return null;

	if (target.fieldId) {
		const targetSection = sections.find((s) => s.key === target.sectionKey);
		if (!targetSection) return null;
		const targetIndex = targetSection.fields.indexOf(target.fieldId);
		if (targetIndex < 0) return null;
		if (fromSectionKey === target.sectionKey) {
			return sections.map((s) =>
				s.key === fromSectionKey
					? reorderFieldsInSection(s, activeFieldId, target.fieldId!)
					: s
			);
		}
		return moveFieldBetweenSections(
			sections,
			activeFieldId,
			fromSectionKey,
			target.sectionKey,
			targetIndex
		);
	}

	const dropSection = sections.find((s) => s.key === target.sectionKey);
	if (!dropSection) return null;
	const toIndex = dropSection.fields.length;
	if (fromSectionKey === target.sectionKey) {
		const fromIndex = dropSection.fields.indexOf(activeFieldId);
		if (fromIndex < 0 || fromIndex === toIndex - 1) return null;
	}
	return moveFieldBetweenSections(sections, activeFieldId, fromSectionKey, target.sectionKey, toIndex);
}

export function applyFieldDragOver(
	sections: DisplaySectionRow[],
	activeFieldId: string,
	overId: string
): DisplaySectionRow[] | null {
	const next = applyFieldDragEnd(sections, activeFieldId, overId);
	if (!next || sectionsFieldLayoutEqual(sections, next)) return null;
	return next;
}

export function orderDisplaySections(
	rows: DisplaySectionRow[],
	stepId: string,
	overrides: ConfigureFieldOverrides
): DisplaySectionRow[] {
	const order = overrides.sectionOrderByStepId?.[stepId];
	if (!order?.length) return rows;
	const byKey = new Map(rows.map((r) => [r.key, r]));
	const fromOrder = order
		.map((key) => byKey.get(key))
		.filter((r): r is DisplaySectionRow => Boolean(r));
	const rest = rows.filter((r) => !order.includes(r.key));
	return [...fromOrder, ...rest];
}

/** Keep added/removed/order in sync with the merged field lists shown in the panel. */
export function syncFieldOverridesFromPanelLayout(
	baseRows: DisplaySectionRow[],
	panelSections: DisplaySectionRow[],
	prev: ConfigureFieldOverrides
): ConfigureFieldOverrides {
	const added = { ...prev.addedBySectionKey };
	const removed = { ...prev.removedFieldIdBySectionKey };
	const fieldOrder: Record<string, string[]> = { ...(prev.fieldOrderBySectionKey ?? {}) };

	for (const panel of panelSections) {
		const base = baseRows.find((r) => r.key === panel.key);
		const baseRaw = base?.fields ?? [];
		const baseSet = new Set(baseRaw);
		const targetSet = new Set(panel.fields);

		fieldOrder[panel.key] = [...panel.fields];
		removed[panel.key] = baseRaw.filter((fid) => !targetSet.has(fid));
		added[panel.key] = [...new Set(panel.fields.filter((fid) => !baseSet.has(fid)))];
	}

	return {
		...prev,
		addedBySectionKey: added,
		removedFieldIdBySectionKey: removed,
		fieldOrderBySectionKey: fieldOrder,
	};
}

/** Apply panel section rows to draft overrides (order + draft section field arrays). */
export function applyLayoutSectionsToConfigureState(
	stepId: string,
	baseRows: DisplaySectionRow[],
	sections: DisplaySectionRow[],
	setDraftSectionsByStepId: Dispatch<SetStateAction<Record<string, ConfigureDraftSection[]>>>,
	setFieldOverrides: Dispatch<SetStateAction<ConfigureFieldOverrides>>
): void {
	const sectionKeys = sections.map((s) => s.key);

	setFieldOverrides((prev) => {
		const synced = syncFieldOverridesFromPanelLayout(baseRows, sections, prev);
		return {
			...synced,
			sectionOrderByStepId: {
				...(synced.sectionOrderByStepId ?? {}),
				[stepId]: sectionKeys,
			},
		};
	});

	setDraftSectionsByStepId((prev) => {
		const drafts = prev[stepId] ?? [];
		if (drafts.length === 0) return prev;
		const nextDrafts = drafts.map((draft) => {
			const key = `draft-${draft.id}`;
			const row = sections.find((s) => s.key === key);
			return row ? { ...draft, fields: [...row.fields] } : draft;
		});
		return { ...prev, [stepId]: nextDrafts };
	});
}
