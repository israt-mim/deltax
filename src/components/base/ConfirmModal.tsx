import type { ReactNode } from "react";
import { useId } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

const DANGER_CONFIRM =
	"!bg-red-600 !text-white hover:!bg-red-700 active:!bg-red-800 focus-visible:!ring-red-500/40 dark:!bg-red-600 dark:hover:!bg-red-700";

export interface ConfirmModalProps {
	open: boolean;
	onClose: () => void;
	title: ReactNode;
	/** Body copy below the title */
	children: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	/**
	 * Called when the user confirms. The parent should close the modal after success
	 * (e.g. clear state driving `open`). On failure, show a toast and leave `open` true.
	 */
	onConfirm: () => void | Promise<void>;
	pending?: boolean;
	/** Use a red primary action (e.g. delete). */
	confirmDanger?: boolean;
	width?: number;
}

/**
 * Confirmation dialog built on the app `Modal` (header / body / footer).
 */
export const ConfirmModal = ({
	open,
	onClose,
	title,
	children,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	pending = false,
	confirmDanger = false,
	width = 440,
}: ConfirmModalProps) => {
	const reactId = useId();
	const titleId = `confirm-modal-title-${reactId}`;

	const handleClose = () => {
		if (!pending) onClose();
	};

	return (
		<Modal
			open={open}
			onCancel={handleClose}
			width={width}
			maskClosable={!pending}
			keyboard={!pending}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					{title}
				</h2>
			}
			footer={
				<div className="flex justify-end gap-3">
					<Button
						type="button"
						size="md"
						appearance="outlined"
						status="secondary-neutral"
						onClick={handleClose}
						disabled={pending}
					>
						{cancelLabel}
					</Button>
					<Button
						type="button"
						size="md"
						appearance="filled"
						status="primary"
						className={confirmDanger ? DANGER_CONFIRM : undefined}
						loading={pending}
						disabled={pending}
						onClick={() => void onConfirm()}
					>
						{confirmLabel}
					</Button>
				</div>
			}
			aria-labelledby={titleId}
		>
			<div className="text-sm text-neutral-600 dark:text-neutral-300">{children}</div>
		</Modal>
	);
};
