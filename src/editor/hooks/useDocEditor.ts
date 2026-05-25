import { useEditor } from "@tiptap/react";
import { useEffect } from "react";
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
import { VariableText } from "../extensions/VariableText";

export interface UseDocEditorOptions {
	content?: string;
	onUpdate?: (html: string, json: Record<string, unknown>) => void;
	variables?: Record<string, string>;
}

export function useDocEditor({ content = "", onUpdate, variables = {} }: UseDocEditorOptions = {}) {
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
			VariableText,
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
			transformPastedHTML(html) {
				// Strip Word/Office conditional comments and namespace elements
				let clean = html
					.replace(/<!--\[if[\s\S]*?endif\]-->/gi, "")
					.replace(/<\/?o:[^>]*>/gi, "")
					.replace(/<\/?w:[^>]*>/gi, "")
					.replace(/<\/?m:[^>]*>/gi, "")
					// Remove mso-* class names but keep the element
					.replace(/\s+class="Mso[^"]*"/gi, "")
					// Preserve Google Docs / external spans with inline styles
					// by keeping style attributes intact
					.replace(/\s+lang="[^"]*"/gi, "")
					.replace(/\s+xml:lang="[^"]*"/gi, "");

				// Convert b/i/u tags that carry inline styles into styled spans
				// so TipTap marks can pick them up
				clean = clean
					.replace(/<b\b([^>]*)>/gi, "<strong$1>")
					.replace(/<\/b>/gi, "</strong>")
					.replace(/<i\b([^>]*)>/gi, "<em$1>")
					.replace(/<\/i>/gi, "</em>")
					.replace(/<s\b([^>]*)>/gi, "<s$1>")
					.replace(/<strike\b([^>]*)>/gi, "<s$1>")
					.replace(/<\/strike>/gi, "</s>");

				return clean;
			},
		},
		parseOptions: {
			preserveWhitespace: "full",
		},
	});

	// Sync variables into extension storage whenever they change
	useEffect(() => {
		if (!editor) return;
		editor.commands.setVariables(variables);
	}, [editor, variables]);

	return editor;
}
