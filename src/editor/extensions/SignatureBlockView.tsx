import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";

export function SignatureBlockView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
	const { src, width: attrWidth } = node.attrs as { src: string; width: number };

	const [width, setWidth] = useState<number>(Number(attrWidth) || 200);
	const widthRef   = useRef<number>(Number(attrWidth) || 200);
	const isResizing = useRef(false);
	const startX     = useRef(0);
	const startWidth = useRef(0);

	// Sync width state when node attrs change (undo/redo)
	useEffect(() => {
		if (!isResizing.current) {
			const w = Number(node.attrs.width) || 200;
			setWidth(w);
			widthRef.current = w;
		}
	}, [node.attrs.width]);

	const onResizeStart = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		isResizing.current = true;
		startX.current     = e.clientX;
		startWidth.current = widthRef.current;

		const onMouseMove = (ev: MouseEvent) => {
			const newWidth = Math.max(60, startWidth.current + (ev.clientX - startX.current));
			widthRef.current = newWidth;
			setWidth(newWidth);
		};

		const onMouseUp = () => {
			isResizing.current = false;
			updateAttributes({ width: widthRef.current });
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	};

	return (
		<NodeViewWrapper>
			<div
				className="relative my-2 inline-block select-none"
				style={{ width }}
				data-drag-handle
			>
				{/* Signature image */}
				{src ? (
					<img
						src={src}
						alt="Signature"
						className="block w-full object-contain"
						draggable={false}
					/>
				) : (
					<div className="h-14 w-full border-b-2 border-neutral-400 dark:border-neutral-500" />
				)}

				{/* Selection ring */}
				{selected && (
					<div className="pointer-events-none absolute inset-0 rounded border-2 border-primary-400 dark:border-primary-500" />
				)}

				{/* Delete button */}
				{selected && (
					<button
						type="button"
						contentEditable={false}
						onClick={() => deleteNode()}
						title="Delete signature"
						className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
					>
						<DeleteOutlinedIcon sx={{ fontSize: 11 }} />
					</button>
				)}

				{/* Resize handle */}
				{selected && (
					<div
						contentEditable={false}
						onMouseDown={onResizeStart}
						title="Drag to resize"
						className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize rounded-sm bg-primary-500 shadow"
					/>
				)}
			</div>
		</NodeViewWrapper>
	);
}
