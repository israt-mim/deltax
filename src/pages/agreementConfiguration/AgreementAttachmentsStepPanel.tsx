import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import cn from "classnames";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import type { ColumnDef } from "@tanstack/react-table";
import {
	useAgreementAttachmentsQuery,
	useCreateAgreementAttachmentFolderMutation,
	useDeleteAgreementAttachmentMutation,
	useUploadAgreementAttachmentMutation,
	type AgreementAttachment,
} from "../../api";
import { Button } from "../../components/base/Button";
import { ConfirmModal } from "../../components/base/ConfirmModal";
import { FloatingBar } from "../../components/base/FloatingBar";
import { InfiniteTable } from "../../components/base/InfiniteTable";
import { SearchInput } from "../../components/form-input/SearchInput";
import { UserIdentity } from "../../components/UserIdentity";
import { createStickyActionsColumn } from "../../components/modules/settings/stickyActionsColumn";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { formatUsDateTime } from "../../lib/formatDateTime";
import {
	canPreviewAttachment,
	resolveAttachmentFileUrl,
} from "../../lib/attachmentDocument";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { AgreementAddAttachmentsModal } from "./AgreementAddAttachmentsModal";
import { AgreementNewFolderModal } from "./AgreementNewFolderModal";

export interface AgreementAttachmentsStepPanelProps {
	agreementId: string;
	readOnly?: boolean;
	previewAttachmentId?: string | null;
	onPreviewAttachmentChange?: (attachment: AgreementAttachment | null) => void;
}

function fileIconClass(kind: AgreementAttachment["kind"]): string {
	return kind === "folder" ? "text-amber-500" : "text-neutral-500 dark:text-neutral-400";
}

function tagsLabel(tags: string[] | undefined): string {
	if (!tags?.length) return "—";
	return tags.join(", ");
}

type AttachmentFolderCrumb = { id: string; name: string };

function AttachmentFolderBreadcrumb({
	path,
	onNavigate,
}: {
	path: AttachmentFolderCrumb[];
	onNavigate: (index: number) => void;
}) {
	if (path.length === 0) return null;

	return (
		<nav
			aria-label="Attachment folder path"
			className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
		>
			<button
				type="button"
				onClick={() => onNavigate(-1)}
				className="shrink-0 text-neutral-600 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400"
			>
				Attachments
			</button>
			{path.map((crumb, index) => {
				const isLast = index === path.length - 1;
				return (
					<span key={crumb.id} className="flex min-w-0 items-center gap-1">
						<ChevronRightIcon
							sx={{ fontSize: 16 }}
							className="shrink-0 text-neutral-400 dark:text-neutral-500"
							aria-hidden
						/>
						{isLast ? (
							<span
								className="truncate font-medium text-neutral-900 dark:text-white"
								aria-current="page"
							>
								{crumb.name}
							</span>
						) : (
							<button
								type="button"
								onClick={() => onNavigate(index)}
								className="max-w-[12rem] truncate text-neutral-600 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400"
							>
								{crumb.name}
							</button>
						)}
					</span>
				);
			})}
		</nav>
	);
}

export function AgreementAttachmentsStepPanel({
	agreementId,
	readOnly = false,
	previewAttachmentId = null,
	onPreviewAttachmentChange,
}: AgreementAttachmentsStepPanelProps) {
	const [folderPath, setFolderPath] = useState<AttachmentFolderCrumb[]>([]);
	const [search, setSearch] = useState("");
	const currentFolderId = folderPath.at(-1)?.id ?? null;
	const debouncedSearch = useDebouncedValue(search, 200);
	const [folderModalOpen, setFolderModalOpen] = useState(false);
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<AgreementAttachment | null>(null);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		setFolderPath([]);
		setSearch("");
	}, [agreementId]);

	const attachmentsQuery = useAgreementAttachmentsQuery({
		agreementId,
		parentFolderId: currentFolderId,
	});
	const createFolderMutation = useCreateAgreementAttachmentFolderMutation();
	const uploadMutation = useUploadAgreementAttachmentMutation();
	const deleteMutation = useDeleteAgreementAttachmentMutation();

	const attachments = attachmentsQuery.data?.attachments ?? [];
	const busy =
		createFolderMutation.isPending || uploadMutation.isPending || deleteMutation.isPending;

	const filtered = useMemo(() => {
		const q = debouncedSearch.trim().toLowerCase();
		if (!q) return attachments;
		return attachments.filter((att) => {
			const name = att.name?.toLowerCase() ?? "";
			const tags = (att.tags ?? []).join(" ").toLowerCase();
			return name.includes(q) || tags.includes(q);
		});
	}, [attachments, debouncedSearch]);

	const sorted = useMemo(() => {
		const folders = filtered.filter((a) => a.kind === "folder");
		const files = filtered.filter((a) => a.kind !== "folder");
		return [...folders, ...files];
	}, [filtered]);

	useEffect(() => {
		setCheckedIds(new Set());
	}, [currentFolderId, agreementId]);

	const handleBulkDelete = useCallback(async () => {
		const ids = [...checkedIds];
		let failed = 0;
		for (const id of ids) {
			try {
				await deleteMutation.mutateAsync({ agreementId, attachmentId: id });
			} catch {
				failed++;
			}
		}
		if (failed === 0) toast.success(`${ids.length} item${ids.length !== 1 ? "s" : ""} deleted.`);
		else toast.error(`${failed} item${failed !== 1 ? "s" : ""} could not be deleted.`);
		setCheckedIds(new Set());
	}, [checkedIds, deleteMutation, agreementId]);

	const navigateToFolder = useCallback(
		(index: number) => {
			onPreviewAttachmentChange?.(null);
			if (index < 0) {
				setFolderPath([]);
				return;
			}
			setFolderPath((prev) => prev.slice(0, index + 1));
		},
		[onPreviewAttachmentChange]
	);

	const handleRowActivate = useCallback(
		(att: AgreementAttachment) => {
			if (att.kind === "folder") {
				const name = att.name?.trim() || "Folder";
				setFolderPath((prev) => [...prev, { id: att.id, name }]);
				onPreviewAttachmentChange?.(null);
				return;
			}
			if (canPreviewAttachment(att)) {
				onPreviewAttachmentChange?.(att);
			}
		},
		[onPreviewAttachmentChange]
	);

	const handleCreateFolder = useCallback(
		async (payload: { name: string; tags: string[] }) => {
			try {
				await createFolderMutation.mutateAsync({
					agreementId,
					name: payload.name,
					tags: payload.tags,
					parentFolderId: currentFolderId,
				});
				toast.success("Folder created.");
				setFolderModalOpen(false);
			} catch (err) {
				toast.error(formatUserFacingError(err, "Could not create folder."));
			}
		},
		[agreementId, createFolderMutation, currentFolderId]
	);

	const handleUploadFiles = useCallback(
		async (files: File[]) => {
			try {
				await uploadMutation.mutateAsync({
					agreementId,
					files,
					parentFolderId: currentFolderId,
				});
				toast.success(files.length === 1 ? "File uploaded." : `${files.length} files uploaded.`);
				setAddModalOpen(false);
			} catch (err) {
				toast.error(formatUserFacingError(err, "Could not upload files."));
			}
		},
		[agreementId, currentFolderId, uploadMutation]
	);

	const handleConfirmDelete = useCallback(async () => {
		if (!pendingDelete) return;
		try {
			await deleteMutation.mutateAsync({
				agreementId,
				attachmentId: pendingDelete.id,
			});
			if (previewAttachmentId === pendingDelete.id) {
				onPreviewAttachmentChange?.(null);
			}
			if (pendingDelete.kind === "folder") {
				setFolderPath((prev) => {
					const index = prev.findIndex((crumb) => crumb.id === pendingDelete.id);
					return index >= 0 ? prev.slice(0, index) : prev;
				});
			}
			toast.success(pendingDelete.kind === "folder" ? "Folder removed." : "File removed.");
			setPendingDelete(null);
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not delete."));
		}
	}, [
		agreementId,
		deleteMutation,
		onPreviewAttachmentChange,
		pendingDelete,
		previewAttachmentId,
	]);

	const rowMenuItems = useCallback(
		(att: AgreementAttachment): MenuProps["items"] => {
			const items: MenuProps["items"] = [];
			if (att.kind === "file" && att.attachmentUrl) {
				items.push({
					key: "download",
					icon: <DownloadOutlinedIcon sx={{ fontSize: 18 }} />,
					label: "Download",
				});
			}
			if (!readOnly) {
				items.push({
					key: "delete",
					icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
					label: "Delete",
					danger: true,
				});
			}
			return items;
		},
		[readOnly]
	);

	const handleRowMenuClick = useCallback(
		(att: AgreementAttachment, key: string) => {
			if (key === "download" && att.kind === "file" && att.attachmentUrl) {
				window.open(resolveAttachmentFileUrl(att), "_blank", "noopener,noreferrer");
				return;
			}
			if (key === "delete") {
				setPendingDelete(att);
			}
		},
		[]
	);

	const dataColumns = useMemo<ColumnDef<AgreementAttachment, unknown>[]>(
		() => [
			{
				id: "name",
				header: "Name",
				size: 260,
				minSize: 140,
				cell: ({ row }) => {
					const att = row.original;
					return (
						<div className="flex min-w-0 items-center gap-2">
							{att.kind === "folder" ? (
								<FolderOutlinedIcon
									fontSize="small"
									className={cn("shrink-0", fileIconClass("folder"))}
								/>
							) : (
								<InsertDriveFileOutlinedIcon
									fontSize="small"
									className={cn("shrink-0", fileIconClass("file"))}
								/>
							)}
							<span className="truncate font-medium">
								{att.name?.trim() || att.originalFileName || "—"}
							</span>
						</div>
					);
				},
			},
			{
				id: "createdAt",
				header: "Created On",
				size: 160,
				minSize: 120,
				cell: ({ row }) =>
					row.original.createdAt ? formatUsDateTime(row.original.createdAt) : "—",
			},
			{
				id: "createdBy",
				header: "Created By",
				size: 180,
				minSize: 130,
				cell: ({ row }) => <UserIdentity user={row.original.createdBy ?? null} />,
			},
			{
				id: "modifiedBy",
				header: "Modified By",
				size: 180,
				minSize: 130,
				cell: ({ row }) => <UserIdentity user={row.original.modifiedBy ?? null} />,
			},
			{
				id: "tags",
				header: "Tags",
				size: 160,
				minSize: 100,
				cell: ({ row }) => tagsLabel(row.original.tags),
			},
		],
		[]
	);

	const actionsColumn = useMemo(
		() =>
			createStickyActionsColumn<AgreementAttachment>(({ row }) => {
				const att = row.original;
				const items = rowMenuItems(att);
				if (!items || items.length === 0) return null;
				return (
					<div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
						<Dropdown
							menu={{ items, onClick: ({ key }) => handleRowMenuClick(att, key) }}
							classNames={{ root: "actions-dropdown-icon" }}
							trigger={["click"]}
						>
							<button
								type="button"
								className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-black-700"
								aria-label="Actions"
							>
								<MoreVertOutlinedIcon fontSize="small" />
							</button>
						</Dropdown>
					</div>
				);
			}),
		[rowMenuItems, handleRowMenuClick]
	);

	const allColumns = useMemo(
		() => [...dataColumns, actionsColumn],
		[dataColumns, actionsColumn]
	);

	const checkboxCfg = useMemo(
		() =>
			readOnly
				? undefined
				: {
						getRowId: (row: AgreementAttachment) => row.id,
						checkedIds,
						setCheckedIds,
					},
		[readOnly, checkedIds]
	);

	const getRowClassName = useCallback(
		(att: AgreementAttachment): string => {
			const isPreviewing = att.id === previewAttachmentId;
			const isClickable = att.kind === "folder" || canPreviewAttachment(att);
			if (isPreviewing) {
				return "bg-primary-50/80 dark:bg-primary-950/30" + (isClickable ? " hover:bg-primary-100/60 dark:hover:bg-primary-900/40" : "");
			}
			if (isClickable) return "bg-white dark:bg-black-800 hover:bg-neutral-50 dark:hover:bg-black-700/60";
			return "bg-white dark:bg-black-800";
		},
		[previewAttachmentId]
	);

	if (attachmentsQuery.isError) {
		return (
			<p className="text-sm text-error-600 dark:text-error-400">
				{formatUserFacingError(attachmentsQuery.error, "Could not load attachments.")}
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{folderPath.length > 0 ? (
				<AttachmentFolderBreadcrumb path={folderPath} onNavigate={navigateToFolder} />
			) : null}

			<div className="flex flex-wrap items-center gap-3">
				<div className="min-w-[200px] max-w-md flex-1">
					<SearchInput
						placeholder="Search (use * as a wildcard)"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						aria-label="Search attachments"
					/>
				</div>
				{!readOnly ? (
					<div className="ml-auto flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							appearance="outlined"
							status="secondary-neutral"
							disabled={busy}
							onClick={() => setFolderModalOpen(true)}
						>
							<CreateNewFolderOutlinedIcon fontSize="small" />
							New folder
						</Button>
						<Button
							type="button"
							size="sm"
							appearance="filled"
							status="primary"
							disabled={busy}
							onClick={() => setAddModalOpen(true)}
						>
							<AddOutlinedIcon fontSize="small" />
							Add attachments
						</Button>
					</div>
				) : null}
			</div>

			<FloatingBar
				open={checkedIds.size > 0}
				selectedCount={checkedIds.size}
				onClearSelection={() => setCheckedIds(new Set())}
				onDelete={() => void handleBulkDelete()}
				deletePending={deleteMutation.isPending}
			/>

			<InfiniteTable<AgreementAttachment>
				data={sorted}
				columns={allColumns}
				height="calc(100vh - 380px)"
				hasMore={false}
				isInitialLoading={attachmentsQuery.isPending}
				checkboxConfig={checkboxCfg}
				onRowClick={(att) => handleRowActivate(att)}
				getRowClassName={getRowClassName}
				emptyMessage={
					debouncedSearch.trim()
						? "No attachments match your search."
						: "No attachments yet. Create a folder or upload PDF files."
				}
			/>

			<AgreementNewFolderModal
				open={folderModalOpen}
				onClose={() => setFolderModalOpen(false)}
				onCreate={handleCreateFolder}
				pending={createFolderMutation.isPending}
			/>

			<AgreementAddAttachmentsModal
				open={addModalOpen}
				onClose={() => setAddModalOpen(false)}
				onUpload={handleUploadFiles}
				pending={uploadMutation.isPending}
			/>

			<ConfirmModal
				open={pendingDelete !== null}
				onClose={() => setPendingDelete(null)}
				title={pendingDelete?.kind === "folder" ? "Delete folder?" : "Delete file?"}
				confirmLabel="Delete"
				confirmDanger
				pending={deleteMutation.isPending}
				onConfirm={() => void handleConfirmDelete()}
			>
				<p className="mb-0 text-neutral-700 dark:text-neutral-300">
					{pendingDelete?.kind === "folder"
						? `Delete folder "${pendingDelete.name}" and everything inside it?`
						: `Delete "${pendingDelete?.name?.trim() || pendingDelete?.originalFileName || "this file"}"?`}
				</p>
			</ConfirmModal>
		</div>
	);
}
