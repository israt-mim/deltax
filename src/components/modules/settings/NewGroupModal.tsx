import { useMemo, useState } from "react";
import { Modal } from "../../base/Modal";
import { FormInput } from "../../form-input/FormInput";
import { FormTextarea } from "../../form-input/FormTextarea";
import { Button } from "../../base/Button";

export type GroupModalVariant = "create" | "edit";

export interface NewGroupPayload {
	name: string;
	description: string;
}

export interface NewGroupModalProps {
	open: boolean;
	variant?: GroupModalVariant;
	initialValues?: { name: string; description: string };
	onClose: () => void;
	onSubmit?: (payload: NewGroupPayload) => void | Promise<void>;
	pending?: boolean;
}

export const NewGroupModal = ({
	open,
	variant = "create",
	initialValues,
	onClose,
	onSubmit,
	pending,
}: NewGroupModalProps) => {
	const [name, setName] = useState(
		() => (variant === "edit" && initialValues ? initialValues.name : "")
	);
	const [description, setDescription] = useState(
		() => (variant === "edit" && initialValues ? (initialValues.description ?? "") : "")
	);
	const [nameError, setNameError] = useState<string | undefined>();

	const formId = useMemo(
		() => (variant === "edit" ? "edit-group-form" : "new-group-form"),
		[variant]
	);
	const titleId = variant === "edit" ? "edit-group-title" : "new-group-title";
	const heading = variant === "edit" ? "Edit Group" : "New Group";
	const submitLabel = variant === "edit" ? "Save changes" : "Create";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setNameError("Group name is required");
			return;
		}
		setNameError(undefined);
		try {
			await onSubmit?.({ name: trimmed, description: description.trim() });
			onClose();
		} catch {
			/* error surfaced by caller */
		}
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					{heading}
				</h2>
			}
			footer={
				<div className="flex justify-end gap-3">
					<Button type="button" size="md" appearance="outlined" status="secondary-neutral" onClick={onClose}>
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
						{submitLabel}
					</Button>
				</div>
			}
			aria-labelledby={titleId}
		>
			<form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
				<FormInput
					label="Group Name"
					required
					placeholder="Add group name"
					value={name}
					onChange={(e) => {
						setName(e.target.value);
						if (nameError) setNameError(undefined);
					}}
					error={nameError}
				/>
				<FormTextarea
					label="Group Description"
					placeholder="Enter group description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					maxLength={128}
					showCount
					rows={4}
					style={{ resize: "vertical" }}
				/>
			</form>
		</Modal>
	);
};
