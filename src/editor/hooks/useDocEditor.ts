import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
	TextStyle,
	Color,
	FontFamily,
	FontSize,
	LineHeight,
} from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";

export interface UseDocEditorOptions {
	content?: string;
	onUpdate?: (html: string, json: Record<string, unknown>) => void;
}

export function useDocEditor({ content = "", onUpdate }: UseDocEditorOptions = {}) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				bulletList: { keepMarks: true, keepAttributes: false },
				orderedList: { keepMarks: true, keepAttributes: false },
			}),
			Underline,
			TextStyle,
			Color,
			FontFamily,
			FontSize,
			LineHeight,
			Highlight.configure({ multicolor: true }),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Link.configure({ openOnClick: false, autolink: true }),
			Image.configure({ inline: false, allowBase64: true }),
			Subscript,
			Superscript,
			TaskList,
			TaskItem.configure({ nested: true }),
			Table.configure({ resizable: true }),
			TableRow,
			TableCell,
			TableHeader,
			CharacterCount,
			Placeholder.configure({ placeholder: "Start typing your document…" }),
		],
		content,
		onUpdate: ({ editor: e }) => {
			onUpdate?.(e.getHTML(), e.getJSON() as Record<string, unknown>);
		},
		editorProps: {
			attributes: {
				class: "doc-editor-content",
				spellcheck: "true",
			},
		},
	});

	return editor;
}
