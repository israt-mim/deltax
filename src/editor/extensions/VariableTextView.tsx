import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

export function VariableTextView({ node, extension }: NodeViewProps) {
	const key = node.attrs.key as string;
	const variables = (extension.storage.variables ?? {}) as Record<string, string>;
	const value = Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : undefined;
	const hasValue = value !== undefined && value !== "";

	return (
		<NodeViewWrapper as="span" style={{ display: "inline" }}>
			<span
				contentEditable={false}
				className={[
					"inline-flex items-center rounded px-1.5 py-0.5 text-[0.85em] font-mono select-none cursor-default",
					hasValue
						? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
						: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
				].join(" ")}
			>
				{hasValue ? value : `{{${key}}}`}
			</span>
		</NodeViewWrapper>
	);
}
