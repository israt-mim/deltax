import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { VariableTextView } from "./VariableTextView";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		variableText: {
			insertVariable: (key: string) => ReturnType;
			setVariables: (variables: Record<string, string>) => ReturnType;
		};
	}
}

export const VariableText = Node.create({
	name: "variableText",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,

	addStorage() {
		return {
			variables: {} as Record<string, string>,
		};
	},

	addAttributes() {
		return {
			key: {
				default: "",
				parseHTML: (el) => el.getAttribute("data-variable-key") ?? "",
				renderHTML: (attrs) => ({ "data-variable-key": attrs.key }),
			},
		};
	},

	parseHTML() {
		return [{ tag: "span[data-variable-key]" }];
	},

	renderHTML({ HTMLAttributes }) {
		return ["span", mergeAttributes({ "data-variable": "" }, HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(VariableTextView);
	},

	addCommands() {
		return {
			insertVariable:
				(key: string) =>
				({ commands }) =>
					commands.insertContent({ type: this.name, attrs: { key } }),

			setVariables:
				(variables: Record<string, string>) =>
				({ editor }) => {
					editor.extensionManager.extensions.forEach((ext) => {
						if (ext.name === "variableText") {
							ext.storage.variables = variables;
						}
					});
					// Dispatch a no-op transaction to trigger node view re-renders
					editor.view.dispatch(editor.view.state.tr);
					return true;
				},
		};
	},

	addInputRules() {
		return [
			new InputRule({
				find: /\{\{([a-zA-Z0-9_]+)\}\}$/,
				handler: ({ state, range, match }) => {
					const node = this.type.create({ key: match[1] });
					state.tr.replaceWith(range.from, range.to, node);
				},
			}),
		];
	},
});
