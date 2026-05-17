import type { ReactNode } from "react";
import cn from "classnames";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
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
	closable,
	...rest
}: ModalProps) => {
	const resolvedClosable =
		closable === false
			? false
			: {
					...(typeof closable === "object" ? closable : {}),
					closeIcon: (
						<CloseOutlinedIcon
							sx={{ fontSize: 20 }}
							className="text-neutral-500 dark:text-neutral-400"
							aria-hidden
						/>
					),
				};

	return (
		<AntdModal
			title={<div className="pb-4">{header}</div>}
			footer={footer != null ? <div className="py-4">{footer}</div> : null}
			centered={centered}
			width={width}
			maskClosable={maskClosable}
			destroyOnHidden={destroyOnHidden}
			keyboard={keyboard}
			rootClassName="app-modal"
			closable={resolvedClosable}
			{...rest}
		>
			<div className={cn("pt-4", footer != null && "pb-4")}>{children}</div>
		</AntdModal>
	);
};
