import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

interface StatusBarProps {
	editor: Editor;
}

export function StatusBar({ editor }: StatusBarProps) {
	const { words, chars } = useEditorState({
		editor,
		selector: (ctx) => {
			const storage = ctx.editor.storage.characterCount as
				| { characters: () => number; words: () => number }
				| undefined;
			return {
				words: storage?.words() ?? 0,
				chars: storage?.characters() ?? 0,
			};
		},
	});

	return (
		<div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-1 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
			<span>
				{words} {words === 1 ? "word" : "words"} · {chars}{" "}
				{chars === 1 ? "character" : "characters"}
			</span>
			<span>Doc Editor</span>
		</div>
	);
}
