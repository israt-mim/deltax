import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import cn from "classnames";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
	useAgreementAttachmentsQuery,
	useCreateAgreementAttachmentFolderMutation,
	useDeleteAgreementAttachmentMutation,
	useUploadAgreementAttachmentMutation,
	type AgreementAttachment,
} from "../../api";
import { Button } from "../../components/base/Button";
import { ConfirmModal } from "../../components/base/ConfirmModal";
import { SearchInput } from "../../components/form-input/SearchInput";
import { UserIdentity } from "../../components/UserIdentity";
import { AgreementTeamsSkeleton } from "../../components/skeletons";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { formatUsDateTime } from "../../lib/formatDateTime";
import { TABLE_EMPTY_CELL_CLASS, TABLE_SHELL_CLASS } from "../../constants/global";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { AgreementAddAttachmentsModal } from "./AgreementAddAttachmentsModal";
import { AgreementNewFolderModal } from "./AgreementNewFolderModal";

export interface AgreementAttachmentsStepPanelProps {
	agreementId: string;
	readOnly?: boolean;
}

function fileIconClass(kind: AgreementAttachment["kind"]): string {
	return kind === "folder" ? "text-amber-500" : "text-neutral-500 dark:text-neutral-400";
}

function tagsLabel(tags: string[] | undefined): string {
	if (!tags?.length) return "—";
	return tags.join(", ");
}

export function AgreementAttachmentsStepPanel({
	agreementId,
	readOnly = false,
}: AgreementAttachmentsStepPanelProps) {
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 200);
	const [folderModalOpen, setFolderModalOpen] = useState(false);
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<AgreementAttachment | null>(null);

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
			toast.success(pendingDelete.kind === "folder" ? "Folder removed." : "File removed.");
			setPendingDelete(null);
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not delete."));
		}
	}, [agreementId, deleteMutation, pendingDelete]);

	const rowMenu = useCallback(
		(att: AgreementAttachment): MenuProps["items"] => {
			if (readOnly) return [];
			const items: MenuProps["items"] = [];
			if (att.kind === "file" && att.attachmentUrl) {
				items.push({
					key: "download",
					label: (
						<a href={att.attachmentUrl} target="_blank" rel="noopener noreferrer">
							Download
						</a>
					),
				});
			}
			items.push({
				key: "delete",
				label: <span className="text-error-600 dark:text-error-400">Delete</span>,
				onClick: () => setPendingDelete(att),
			});
			return items;
		},
		[readOnly]
	);

	if (attachmentsQuery.isPending) {
		return <AgreementTeamsSkeleton />;
	}

	if (attachmentsQuery.isError) {
		return (
			<p className="text-sm text-error-600 dark:text-error-400">
				{formatUserFacingError(attachmentsQuery.error, "Could not load attachments.")}
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					{currentFolderId ? (
						<Button
							type="button"
							size="sm"
							appearance="outlined"
							status="secondary-neutral"
							onClick={() => setCurrentFolderId(null)}
						>
							<ArrowBackOutlinedIcon fontSize="small" />
							Back
						</Button>
					) : null}
					<span className="text-sm text-neutral-600 dark:text-neutral-400">
						{sorted.length} {sorted.length === 1 ? "item" : "items"}
					</span>
				</div>
				{!readOnly ? (
					<div className="flex flex-wrap gap-2">
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

			<SearchInput
				placeholder="Search (use * as a wildcard)"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				aria-label="Search attachments"
			/>

			<div className={cn(TABLE_SHELL_CLASS, "overflow-x-auto")}>
				<table className="min-w-full text-left text-sm">
					<thead className="bg-neutral-50 text-neutral-600 dark:bg-black-900 dark:text-neutral-300">
						<tr>
							<th className="px-4 py-3 font-medium">Name</th>
							<th className="px-4 py-3 font-medium">Created On</th>
							<th className="px-4 py-3 font-medium">Created By</th>
							<th className="px-4 py-3 font-medium">Modified By</th>
							<th className="px-4 py-3 font-medium">Tags</th>
							<th className="w-12 px-4 py-3" />
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-200 dark:divide-black-600">
						{sorted.length === 0 ? (
							<tr className="bg-white dark:bg-black-800">
								<td
									colSpan={6}
									className={cn(TABLE_EMPTY_CELL_CLASS, "text-sm text-neutral-500 dark:text-neutral-400")}
								>
									{debouncedSearch.trim()
										? "No attachments match your search."
										: "No attachments yet. Create a folder or upload files."}
								</td>
							</tr>
						) : (
							sorted.map((att) => (
								<tr key={att.id} className="bg-white dark:bg-black-800">
									<td className="px-4 py-3">
										{att.kind === "folder" ? (
											<button
												type="button"
												className="flex min-w-0 items-center gap-2 font-medium text-primary-700 hover:underline dark:text-primary-300"
												onClick={() => setCurrentFolderId(att.id)}
											>
												<FolderOutlinedIcon fontSize="small" className={fileIconClass("folder")} />
												<span className="truncate">{att.name}</span>
											</button>
										) : (
											<div className="flex min-w-0 items-center gap-2 font-medium text-neutral-900 dark:text-white">
												<InsertDriveFileOutlinedIcon
													fontSize="small"
													className={cn("shrink-0", fileIconClass("file"))}
												/>
												{att.attachmentUrl ? (
													<a
														href={att.attachmentUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="truncate hover:text-primary-600 dark:hover:text-primary-400"
													>
														{att.name?.trim() || att.originalFileName || "—"}
													</a>
												) : (
													<span className="truncate">
														{att.name?.trim() || att.originalFileName || "—"}
													</span>
												)}
											</div>
										)}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-300">
										{att.createdAt ? formatUsDateTime(att.createdAt) : "—"}
									</td>
									<td className="px-4 py-3">
										<UserIdentity user={att.createdBy ?? null} />
									</td>
									<td className="px-4 py-3">
										<UserIdentity user={att.modifiedBy ?? null} />
									</td>
									<td className="max-w-[160px] truncate px-4 py-3 text-neutral-600 dark:text-neutral-300">
										{tagsLabel(att.tags)}
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex justify-end gap-1">
											{att.kind === "file" && att.attachmentUrl ? (
												<a
													href={att.attachmentUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-black-700"
													aria-label={`Download ${att.name}`}
												>
													<DownloadOutlinedIcon fontSize="small" />
												</a>
											) : null}
											{(rowMenu(att)?.length ?? 0) > 0 ? (
												<Dropdown menu={{ items: rowMenu(att) }} trigger={["click"]}>
													<button
														type="button"
														className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-black-700"
														aria-label="Actions"
													>
														<MoreVertOutlinedIcon fontSize="small" />
													</button>
												</Dropdown>
											) : null}
											{!readOnly && att.kind === "file" ? (
												<button
													type="button"
													className="inline-flex items-center justify-center rounded-md p-2 text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-950/40"
													aria-label={`Delete ${att.name}`}
													disabled={busy}
													onClick={() => setPendingDelete(att)}
												>
													<DeleteOutlineOutlinedIcon fontSize="small" />
												</button>
											) : null}
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

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
						? `Delete folder “${pendingDelete.name}” and everything inside it?`
						: `Delete “${pendingDelete?.name?.trim() || pendingDelete?.originalFileName || "this file"}”?`}
				</p>
			</ConfirmModal>
		</div>
	);
}
