import { useCallback, useMemo, useState } from "react";
import { NewTemplateModal } from "./templates/NewTemplateModal";
import { TemplateEditorSidebar } from "./templates/TemplateEditorSidebar";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Card } from "../components/base/Card";
import { Button } from "../components/base/Button";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { FloatingBar } from "../components/base/FloatingBar";
import { SearchInput } from "../components/form-input/SearchInput";
import { useColumns, type ColumnConfig } from "../hooks/useColumns";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { formatUsDateTime } from "../lib/formatDateTime";
import { crumb } from "../lib/breadcrumb";
import { useDeleteTemplateMutation, useTemplatesInfiniteList } from "../api/hooks/templates";
import type { TemplateRow, TemplateUserRef } from "../api/services/templates";
import { UserIdentity } from "../components/UserIdentity";
import type { ApiUserRef } from "../lib/userDisplay";
import { createStickyActionsColumn } from "../components/modules/settings/stickyActionsColumn";

const templateColumnConfigs: ColumnConfig<TemplateRow>[] = [
	{ key: "name", name: "Name", width: 200, minWidth: 140, sortable: true },
	{ key: "category", name: "Category", width: 160, minWidth: 100 },
	{ key: "domain", name: "Domain", width: 160, minWidth: 100 },
	{ key: "type", name: "Type", width: 160, minWidth: 100 },
	{ key: "subtype", name: "Subtype", width: 160, minWidth: 100 },
	{
		key: "description",
		name: "Description",
		width: 260,
		minWidth: 140,
		cell: ({ getValue }) => {
			const v = getValue() as string;
			return v ? (
				<span className="block truncate text-neutral-500 dark:text-neutral-400">{v}</span>
			) : null;
		},
	},
	{
		key: "createdBy",
		name: "Created By",
		width: 180,
		minWidth: 130,
		cell: ({ getValue }) => (
			<UserIdentity user={getValue() as TemplateUserRef | null as ApiUserRef | null} size="sm" />
		),
	},
	{
		key: "createdAt",
		name: "Created On",
		width: 160,
		minWidth: 120,
		cell: ({ getValue }) => formatUsDateTime(String(getValue())),
	},
	{
		key: "updatedBy",
		name: "Updated By",
		width: 180,
		minWidth: 130,
		cell: ({ getValue }) => (
			<UserIdentity user={getValue() as TemplateUserRef | null as ApiUserRef | null} size="sm" />
		),
	},
	{
		key: "updatedAt",
		name: "Updated On",
		width: 160,
		minWidth: 120,
		cell: ({ getValue }) => formatUsDateTime(String(getValue())),
	},
];

function TemplateRowMenu({
	row,
	onDeleteRequest,
}: {
	row: TemplateRow;
	onDeleteRequest: (row: TemplateRow) => void;
}) {
	const items: MenuProps["items"] = [
		{
			key: "delete",
			icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
			label: "Delete",
			danger: true,
		},
	];

	return (
		<div
			className="flex items-center justify-center"
			data-row-click-ignore
			onClick={(e) => e.stopPropagation()}
		>
			<Dropdown
				trigger={["click"]}
				classNames={{ root: "actions-dropdown-icon" }}
				menu={{
					items,
					onClick: ({ key, domEvent }) => {
						domEvent.preventDefault();
						domEvent.stopPropagation();
						if (key === "delete") onDeleteRequest(row);
					},
				}}
			>
				<button
					type="button"
					aria-label="Template actions"
					className="flex rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-black-600"
				>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</button>
			</Dropdown>
		</div>
	);
}

export function TemplatesPage() {
	usePageBreadcrumb([
		crumb("Configure", "/configure"),
		crumb("Templates", "/configure/templates"),
	]);

	const columns = useColumns(templateColumnConfigs);
	const [searchInput, setSearchInput] = useState("");
	const debouncedSearch = useDebouncedValue(searchInput, 400);
	const [pendingDelete, setPendingDelete] = useState<TemplateRow | null>(null);
	const [newModalOpen, setNewModalOpen] = useState(false);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
	const [sidebarWidth, setSidebarWidth] = useState(0);
	const [editorFullscreen, setEditorFullscreen] = useState(false);

	const listQuery = useTemplatesInfiniteList({ sort: "-createdAt" });
	const deleteMutation = useDeleteTemplateMutation();

	const rows = useMemo(() => {
		const all = listQuery.data?.pages.flatMap((p) => p.data) ?? [];
		if (!debouncedSearch.trim()) return all;
		const q = debouncedSearch.toLowerCase();
		return all.filter(
			(r) =>
				r.name.toLowerCase().includes(q) ||
				r.category.toLowerCase().includes(q) ||
				r.domain.toLowerCase().includes(q) ||
				r.type.toLowerCase().includes(q) ||
				r.subtype.toLowerCase().includes(q),
		);
	}, [listQuery.data, debouncedSearch]);

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const clearSelection = useCallback(() => setCheckedIds(new Set()), []);

	const confirmDelete = useCallback(async () => {
		if (!pendingDelete) return;
		try {
			await deleteMutation.mutateAsync(pendingDelete.id);
			toast.success("Template deleted.");
			setCheckedIds((prev) => {
				const next = new Set(prev);
				next.delete(pendingDelete.id);
				return next;
			});
			setPendingDelete(null);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete template."));
		}
	}, [deleteMutation, pendingDelete]);

	const handleBulkDelete = useCallback(async () => {
		const ids = [...checkedIds];
		if (!ids.length) return;
		let successCount = 0;
		for (const id of ids) {
			try {
				await deleteMutation.mutateAsync(id);
				successCount++;
			} catch {
				// continue deleting the rest
			}
		}
		if (successCount > 0) toast.success(`${successCount} template${successCount !== 1 ? "s" : ""} deleted.`);
		if (successCount < ids.length) toast.error(`${ids.length - successCount} template${ids.length - successCount !== 1 ? "s" : ""} could not be deleted.`);
		clearSelection();
	}, [checkedIds, deleteMutation, clearSelection]);

	const actionsColumn = useMemo(
		() => createStickyActionsColumn<TemplateRow>(
			({ row }) => <TemplateRowMenu row={row.original} onDeleteRequest={setPendingDelete} />
		),
		[],
	);

	const isInitialLoading = listQuery.isLoading && !listQuery.data;

	return (
		<CardMain className="relative !p-0 overflow-hidden">
			{/* Content wrapper — shifts left when sidebar opens; hidden in fullscreen */}
			<div
				className="flex flex-col gap-4 p-6 transition-[padding] duration-200"
				style={
					editorFullscreen
						? { display: "none" }
						: selectedTemplateId
						? { paddingRight: sidebarWidth + 24 }
						: undefined
				}
			>
				<div className="flex items-center justify-between">
					<Title>Templates</Title>
					<Button size="md" onClick={() => setNewModalOpen(true)}>
						<AddOutlinedIcon sx={{ fontSize: 14 }} />
						New Template
					</Button>
				</div>

				{listQuery.isError && (
					<p className="text-sm text-error-500">
						{formatUserFacingError(listQuery.error, "Could not load templates.")}{" "}
						<button
							type="button"
							className="font-medium text-primary-600 underline dark:text-primary-400"
							onClick={() => void listQuery.refetch()}
						>
							Retry
						</button>
					</p>
				)}

				<Card className="flex flex-col gap-3">
					<SearchInput
						placeholder="Search templates…"
						aria-label="Search templates"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="max-w-md"
					/>

					<FloatingBar
						open={checkedIds.size > 0}
						selectedCount={checkedIds.size}
						onClearSelection={clearSelection}
						onDelete={handleBulkDelete}
					/>

					<InfiniteTable
						data={rows}
						columns={[...columns, actionsColumn]}
						height="calc(100vh - 200px)"
						onLoadMore={loadMore}
						isLoading={listQuery.isFetchingNextPage}
						isInitialLoading={isInitialLoading}
						hasMore={Boolean(listQuery.hasNextPage)}
						onRowClick={(row) => setSelectedTemplateId(row.id)}
						checkboxConfig={{
							getRowId: (row) => row.id,
							checkedIds,
							setCheckedIds,
						}}
					/>

					<ConfirmModal
						open={pendingDelete !== null}
						onClose={() => setPendingDelete(null)}
						title="Delete this template?"
						confirmLabel="Delete"
						cancelLabel="Cancel"
						confirmDanger
						pending={deleteMutation.isPending}
						onConfirm={confirmDelete}
					>
						<p className="mb-0">
							<span className="font-medium text-neutral-800 dark:text-neutral-100">
								{pendingDelete?.name ? `"${pendingDelete.name}"` : "This template"}
							</span>{" "}
							will be permanently removed. This cannot be undone.
						</p>
					</ConfirmModal>
				</Card>

				<NewTemplateModal
					open={newModalOpen}
					onClose={() => setNewModalOpen(false)}
					onCreated={(id) => {
						setNewModalOpen(false);
						setSelectedTemplateId(id);
					}}
				/>
			</div>

			<TemplateEditorSidebar
				templateId={selectedTemplateId}
				onClose={() => {
					setSelectedTemplateId(null);
					setSidebarWidth(0);
					setEditorFullscreen(false);
				}}
				onWidthChange={setSidebarWidth}
				onFullscreenChange={setEditorFullscreen}
			/>
		</CardMain>
	);
}
