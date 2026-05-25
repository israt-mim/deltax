import { DocEditor } from "../editor";

export function DocEditorPage() {
	return (
		<div className="flex h-[calc(100vh-48px)] flex-col overflow-hidden">
			<DocEditor />
		</div>
	);
}
