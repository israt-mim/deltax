import { forwardRef, useImperativeHandle, useRef } from "react";
import { EditorContent } from "@tiptap/react";
import { Toolbar } from "./components/Toolbar";
import { StatusBar } from "./components/StatusBar";
import { useDocEditor } from "./hooks/useDocEditor";
import "./editor.css";

export interface DocEditorProps {
	initialContent?: string;
	onContentChange?: (html: string, json: Record<string, unknown>) => void;
	className?: string;
	variables?: Record<string, string>;
}

export interface DocEditorHandle {
	insertVariable: (key: string) => void;
}

export const DocEditor = forwardRef<DocEditorHandle, DocEditorProps>(function DocEditor(
	{ initialContent = "", onContentChange, className = "", variables },
	ref
) {
	const canvasRef = useRef<HTMLDivElement>(null);
	const editor = useDocEditor({ content: initialContent, onUpdate: onContentChange, variables });

	useImperativeHandle(ref, () => ({
		insertVariable: (key: string) => {
			editor?.commands.insertVariable(key);
		},
	}), [editor]);

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
});
