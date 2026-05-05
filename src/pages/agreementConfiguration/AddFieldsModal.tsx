import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "antd";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Modal } from "../../components/base/Modal";
import { Button } from "../../components/base/Button";
import { InfiniteTable } from "../../components/base/InfiniteTable";
import { useColumns, type ColumnConfig } from "../../hooks/useColumns";
import type { FieldRow } from "../../schemas/fieldConfiguration";
import { useFieldsInfiniteList } from "../../api/hooks/fields";

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
	const navigate = useNavigate();
	const [searchInput, setSearchInput] = useState("");
	const [debouncedQ, setDebouncedQ] = useState("");
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
		return () => window.clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		if (!open) return;
		setSearchInput("");
		setDebouncedQ("");
		setCheckedIds(new Set());
	}, [open]);

	const listQuery = useFieldsInfiniteList({ q: debouncedQ, sort: "-createdAt", enabled: open });
	const columns = useColumns(addFieldsColumnConfigs);

	const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data) ?? [], [listQuery.data]);

	const excludeSet = useMemo(() => new Set(excludeFieldIds.filter(Boolean)), [excludeFieldIds]);

	const visibleRows = useMemo(() => rows.filter((r) => !excludeSet.has(r.id)), [rows, excludeSet]);

	useEffect(() => {
		if (!open) return;
		setCheckedIds((prev) => {
			const allowed = new Set(visibleRows.map((r) => r.id));
			return new Set([...prev].filter((id) => allowed.has(id)));
		});
	}, [open, visibleRows]);

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

	const titleId = "add-fields-modal-title";

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={960}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					Add Field
				</h2>
			}
			footer={
				<div className="flex flex-wrap justify-end gap-3">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="primary"
						onClick={() => {
							onClose();
							void navigate("/configure/fields/create");
						}}
					>
						Create New Field
					</Button>
					<Button type="button" size="md" appearance="filled" status="primary" onClick={handleConfirm}>
						Add Field
					</Button>
				</div>
			}
			aria-labelledby={titleId}
		>
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center justify-end gap-2">
					<div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
						<Input
							allowClear
							prefix={<SearchOutlinedIcon className="text-neutral-400" />}
							placeholder="Search (use * as a wildcard)"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="max-w-md min-w-[12rem] flex-1"
						/>
						<button
							type="button"
							className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
							aria-label="Filter"
							onClick={() => toast.info("Filters are not available yet.")}
						>
							<FilterListOutlinedIcon sx={{ fontSize: 20 }} />
						</button>
						<button
							type="button"
							className="rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
							aria-label="Sort"
							onClick={() => toast.info("Sort from the column headers.")}
						>
							<SwapVertOutlinedIcon sx={{ fontSize: 20 }} />
						</button>
					</div>
				</div>
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
		</Modal>
	);
};
