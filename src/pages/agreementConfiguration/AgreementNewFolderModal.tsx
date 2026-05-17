import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "../../components/base/Button";
import { Modal } from "../../components/base/Modal";
import { FormInput } from "../../components/form-input/FormInput";

export interface AgreementNewFolderModalProps {
	open: boolean;
	onClose: () => void;
	onCreate: (payload: { name: string; tags: string[] }) => void | Promise<void>;
	pending?: boolean;
}

function parseTagsInput(raw: string): string[] {
	return [
		...new Set(
			raw
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean)
		),
	];
}

export function AgreementNewFolderModal({
	open,
	onClose,
	onCreate,
	pending = false,
}: AgreementNewFolderModalProps) {
	const formId = useMemo(() => "new-attachment-folder-form", []);
	const titleId = useId();
	const [name, setName] = useState("");
	const [tagsInput, setTagsInput] = useState("");
	const [nameError, setNameError] = useState<string | undefined>();

	useEffect(() => {
		if (!open) return;
		setName("");
		setTagsInput("");
		setNameError(undefined);
	}, [open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setNameError("Folder name is required");
			return;
		}
		setNameError(undefined);
		try {
			await onCreate({ name: trimmed, tags: parseTagsInput(tagsInput) });
		} catch {
			/* error surfaced by caller */
		}
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={560}
			maskClosable={!pending}
			keyboard={!pending}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					New Folder
				</h2>
			}
			footer={
				<div className="flex justify-end gap-3">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						onClick={onClose}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form={formId}
						size="md"
						appearance="filled"
						status="primary"
						loading={pending}
						disabled={pending}
					>
						Create
					</Button>
				</div>
			}
			aria-labelledby={titleId}
		>
			<form id={formId} onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
				<FormInput
					label="Folder Name"
					required
					placeholder="Add folder name"
					value={name}
					onChange={(e) => {
						setName(e.target.value);
						if (nameError) setNameError(undefined);
					}}
					error={nameError}
					disabled={pending}
					autoFocus
				/>
				<FormInput
					label="Tags"
					placeholder="Comma-separated tags (optional)"
					value={tagsInput}
					onChange={(e) => setTagsInput(e.target.value)}
					disabled={pending}
				/>
			</form>
		</Modal>
	);
}
