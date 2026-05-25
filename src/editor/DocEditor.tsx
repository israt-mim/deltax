import { useRef } from "react";
import { EditorContent } from "@tiptap/react";
import { Toolbar } from "./components/Toolbar";
import { StatusBar } from "./components/StatusBar";
import { useDocEditor } from "./hooks/useDocEditor";
import "./editor.css";

export interface DocEditorProps {
	initialContent?: string;
	onContentChange?: (html: string) => void;
	className?: string;
}

export function DocEditor({
	initialContent = "",
	onContentChange,
	className = "",
}: DocEditorProps) {
	const canvasRef = useRef<HTMLDivElement>(null);
	const editor = useDocEditor({ content: initialContent, onUpdate: onContentChange });

	if (!editor) return null;

	return (
		<div className={`doc-editor-shell ${className}`}>
			<Toolbar editor={editor} />
			<div className="doc-editor-canvas" ref={canvasRef}>
				<div className="doc-editor-page">
					<EditorContent editor={editor} />
				</div>
			</div>
			<StatusBar editor={editor} />
		</div>
	);
}
