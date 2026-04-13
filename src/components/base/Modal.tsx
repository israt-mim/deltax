import type { ReactNode } from "react";
import { Modal as antdModal, type ModalProps as AntdModalProps } from "antd";

const AntdModal = antdModal;

export type ModalProps = Omit<AntdModalProps, "title" | "footer" | "children"> & {
	/** Header area — maps to antd Modal `title` (supports string or custom node) */
	header: ReactNode;
	/** Body — main content */
	children: ReactNode;
	/** Footer — actions row; omit or pass `null` to hide the footer */
	footer?: ReactNode | null;
};

/**
 * Reusable modal built on antd `Modal` with explicit **header / body / footer** slots.
 * Default footer is hidden (`null`) so you don’t get extra OK/Cancel unless you pass `footer`.
 */
export const Modal = ({
	header,
	children,
	footer = null,
	centered = true,
	width = 520,
	maskClosable = true,
	destroyOnHidden = true,
	keyboard = true,
	...rest
}: ModalProps) => (
	<AntdModal
		title={header}
		footer={footer ?? null}
		centered={centered}
		width={width}
		maskClosable={maskClosable}
		destroyOnHidden={destroyOnHidden}
		keyboard={keyboard}
		{...rest}
	>
		{children}
	</AntdModal>
);
