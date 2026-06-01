import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SignatureBlockView } from "./SignatureBlockView";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		signatureBlock: {
			insertSignatureBlock: (attrs?: { src?: string; width?: number }) => ReturnType;
		};
	}
}

export const SignatureBlock = Node.create({
	name: "signatureBlock",
	group: "block",
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			src:   { default: "" },
			width: { default: 200 },
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="signature-block"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		const { src, width } = HTMLAttributes as { src: string; width: number };
		const w = Number(width) || 200;
		return [
			"div",
			mergeAttributes({ "data-type": "signature-block" }, HTMLAttributes),
			src
				? ["img", { src, alt: "Signature", style: `display:block;width:${w}px;height:auto;object-fit:contain;` }]
				: ["div", { style: `border-bottom:2px solid #374151;height:56px;width:${w}px;` }],
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(SignatureBlockView);
	},

	addCommands() {
		return {
			insertSignatureBlock:
				(attrs = {}) =>
				({ commands }) => {
					return commands.insertContent({ type: this.name, attrs });
				},
		};
	},
});
