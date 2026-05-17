import { useCallback, useEffect, useId, useRef, useState } from "react";
import cn from "classnames";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { Button } from "../../components/base/Button";
import { Modal } from "../../components/base/Modal";

const ACCEPT =
	".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface AgreementAddAttachmentsModalProps {
	open: boolean;
	onClose: () => void;
	onUpload: (files: File[]) => void | Promise<void>;
	pending?: boolean;
}

export function AgreementAddAttachmentsModal({
	open,
	onClose,
	onUpload,
	pending = false,
}: AgreementAddAttachmentsModalProps) {
	const titleId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [files, setFiles] = useState<File[]>([]);
	const [dragOver, setDragOver] = useState(false);

	useEffect(() => {
		if (!open) return;
		setFiles([]);
		setDragOver(false);
	}, [open]);

	const addFiles = useCallback((list: FileList | File[]) => {
		const next = Array.from(list);
		if (next.length === 0) return;
		setFiles((prev) => {
			const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
			const merged = [...prev];
			for (const f of next) {
				const key = `${f.name}-${f.size}`;
				if (seen.has(key)) continue;
				seen.add(key);
				merged.push(f);
			}
			return merged;
		});
	}, []);

	const handleSubmit = () => {
		if (files.length === 0) return;
		void onUpload(files);
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={560}
			maskClosable={!pending}
			keyboard={!pending}
			aria-labelledby={titleId}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					Add Attachments
				</h2>
			}
			footer={
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						disabled={pending}
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="md"
						appearance="filled"
						status="primary"
						disabled={pending || files.length === 0}
						onClick={handleSubmit}
					>
						Add
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-4">
				<p className="mb-0 text-sm text-neutral-600 dark:text-neutral-400">Click or drag and drop</p>
				<input
					ref={inputRef}
					type="file"
					className="hidden"
					multiple
					accept={ACCEPT}
					onChange={(e) => {
						if (e.target.files) addFiles(e.target.files);
						e.target.value = "";
					}}
				/>
				<button
					type="button"
					disabled={pending}
					className={cn(
						"flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors",
						dragOver
							? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/30"
							: "border-neutral-300 bg-neutral-50 hover:border-primary-400 dark:border-black-600 dark:bg-black-900"
					)}
					onClick={() => inputRef.current?.click()}
					onDragOver={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={() => setDragOver(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragOver(false);
						if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
					}}
				>
					<CloudUploadOutlinedIcon className="!text-4xl text-primary-600 dark:text-primary-400" />
					<span className="text-sm">
						<span className="font-medium text-primary-600 dark:text-primary-400">Click to upload</span>
						<span className="text-neutral-500 dark:text-neutral-400"> or drag and drop</span>
					</span>
				</button>

				{files.length > 0 ? (
					<ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 p-2 dark:border-black-600">
						{files.map((file) => (
							<li
								key={`${file.name}-${file.size}`}
								className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200"
							>
								<InsertDriveFileOutlinedIcon fontSize="small" className="shrink-0 text-neutral-400" />
								<span className="min-w-0 flex-1 truncate">{file.name}</span>
								<button
									type="button"
									className="shrink-0 text-xs text-error-600 hover:underline dark:text-error-400"
									disabled={pending}
									onClick={() =>
										setFiles((prev) =>
											prev.filter((f) => !(f.name === file.name && f.size === file.size))
										)
									}
								>
									Remove
								</button>
							</li>
						))}
					</ul>
				) : null}
			</div>
		</Modal>
	);
}
