import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchInput } from "../../components/form-input/SearchInput";
import { toast } from "react-toastify";
import { Modal } from "../../components/base/Modal";
import { Button } from "../../components/base/Button";
import { InfiniteTable } from "../../components/base/InfiniteTable";
import { useColumns, type ColumnConfig } from "../../hooks/useColumns";
import type { FieldRow } from "../../schemas/fieldConfiguration";
import { useFieldsInfiniteList } from "../../api/hooks/fields";
import { CreateFieldForm, type CreateFieldFormHandle } from "../fieldConfiguration/CreateFieldForm";

const TAG_SURFACE_CLASSES = [
	"bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
	"bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200",
	"bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
	"bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-200",
	"bg-neutral-200 text-neutral-800 dark:bg-black-500 dark:text-neutral-200",
];

function tagClassForLabel(tag: string): string {
	let h = 0;
	for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
	return TAG_SURFACE_CLASSES[h % TAG_SURFACE_CLASSES.length];
}

const addFieldsColumnConfigs: ColumnConfig<FieldRow>[] = [
	{ key: "name", name: "Name", width: 180, minWidth: 120, sortable: true },
	{ key: "group", name: "Group", width: 200, minWidth: 120, sortable: true },
	{ key: "groupTechnicalName", name: "Group Technical Name", width: 210, minWidth: 140, sortable: true },
	{
		key: "tags",
		name: "Tags",
		width: 200,
		minWidth: 100,
		sortable: true,
		cell: ({ getValue }) => {
			const tags = getValue() as string[];
			if (!tags?.length) return null;
			return (
				<div className="flex flex-wrap gap-1">
					{tags.map((tag) => (
						<span
							key={tag}
							className={`rounded px-2 py-0.5 text-xs font-medium ${tagClassForLabel(tag)}`}
						>
							{tag}
						</span>
					))}
				</div>
			);
		},
	},
];

type AddFieldsModalView = "pick" | "create";

export interface AddFieldsModalProps {
	open: boolean;
	/** Section row key fields are being added to; required when confirming. */
	sectionKey: string | null;
	/** Field ids already in this section — hidden from the picker. */
	excludeFieldIds?: string[];
	onClose: () => void;
	/** Called with selected field row ids (Mongo ObjectIds) and the section key. */
	onConfirm: (fieldIds: string[], sectionKey: string) => void;
}

export const AddFieldsModal = ({ open, sectionKey, excludeFieldIds = [], onClose, onConfirm }: AddFieldsModalProps) => {
	const [view, setView] = useState<AddFieldsModalView>("pick");
	const [searchInput, setSearchInput] = useState("");
	const [debouncedQ, setDebouncedQ] = useState("");
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const createFormRef = useRef<CreateFieldFormHandle>(null);
	const [createPending, setCreatePending] = useState(false);

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
		return () => window.clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		if (!open) return;
		setView("pick");
		setSearchInput("");
		setDebouncedQ("");
		setCheckedIds(new Set());
		createFormRef.current?.reset();
	}, [open]);

	const listQuery = useFieldsInfiniteList({ q: debouncedQ, sort: "-createdAt", enabled: open && view === "pick" });
	const columns = useColumns(addFieldsColumnConfigs);

	const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const excludeSet = useMemo(() => new Set(excludeFieldIds.filter(Boolean)), [excludeFieldIds]);

	const visibleRows = useMemo(() => rows.filter((r) => !excludeSet.has(r.id)), [rows, excludeSet]);

	useEffect(() => {
		if (!open || view !== "pick") return;
		setCheckedIds((prev) => {
			const allowed = new Set(visibleRows.map((r) => r.id));
			return new Set([...prev].filter((id) => allowed.has(id)));
		});
	}, [open, view, visibleRows]);

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const handleConfirm = useCallback(() => {
		if (!sectionKey) {
			toast.info("No section selected.");
			return;
		}
		if (checkedIds.size === 0) {
			toast.info("Select at least one field.");
			return;
		}
		onConfirm([...checkedIds], sectionKey);
		onClose();
	}, [checkedIds, onConfirm, onClose, sectionKey]);

	const handleOpenCreate = useCallback(() => {
		createFormRef.current?.reset();
		setView("create");
	}, []);

	const handleBackToPick = useCallback(() => {
		setView("pick");
	}, []);

	const handleCreateAndAdd = useCallback(async () => {
		if (!sectionKey) {
			toast.info("No section selected.");
			return;
		}
		setCreatePending(true);
		try {
			const newFieldId = await createFormRef.current?.submit();
			if (!newFieldId) return;
			onConfirm([newFieldId], sectionKey);
			onClose();
		} finally {
			setCreatePending(false);
		}
	}, [onConfirm, onClose, sectionKey]);

	const titleId = "add-fields-modal-title";
	const modalTitle = view === "create" ? "Create Field" : "Add Field";

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={view === "create" ? 720 : 960}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					{modalTitle}
				</h2>
			}
			footer={
				view === "pick" ? (
					<div className="flex flex-wrap justify-end gap-3">
						<Button
							type="button"
							size="md"
							appearance="outlined"
							status="primary"
							onClick={handleOpenCreate}
						>
							Create New Field
						</Button>
						<Button type="button" size="md" appearance="filled" status="primary" onClick={handleConfirm}>
							Add Field
						</Button>
					</div>
				) : (
					<div className="flex flex-wrap justify-end gap-3">
						<Button
							type="button"
							size="md"
							appearance="outlined"
							status="secondary-neutral"
							onClick={handleBackToPick}
							disabled={createPending}
						>
							Back
						</Button>
						<Button
							type="button"
							size="md"
							appearance="filled"
							status="primary"
							onClick={() => void handleCreateAndAdd()}
							loading={createPending}
						>
							Create &amp; Add Field
						</Button>
					</div>
				)
			}
			aria-labelledby={titleId}
		>
			{view === "pick" ? (
				<div className="flex flex-col gap-3">
					<SearchInput
						placeholder="Search fields…"
						aria-label="Search fields"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="w-full max-w-md min-w-[12rem]"
					/>
					<InfiniteTable<FieldRow>
						data={visibleRows}
						columns={columns}
						height={420}
						onLoadMore={loadMore}
						isLoading={listQuery.isFetchingNextPage}
						isInitialLoading={listQuery.isLoading && !listQuery.data}
						hasMore={Boolean(listQuery.hasNextPage)}
						checkboxConfig={{
							getRowId: (row) => row.id,
							checkedIds,
							setCheckedIds,
						}}
					/>
				</div>
			) : (
				<CreateFieldForm ref={createFormRef} />
			)}
		</Modal>
	);
};
