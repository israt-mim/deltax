import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import FormatBoldOutlinedIcon from "@mui/icons-material/FormatBoldOutlined";
import FormatItalicOutlinedIcon from "@mui/icons-material/FormatItalicOutlined";
import FormatUnderlinedOutlinedIcon from "@mui/icons-material/FormatUnderlinedOutlined";
import StrikethroughSOutlinedIcon from "@mui/icons-material/StrikethroughSOutlined";
import FormatAlignLeftOutlinedIcon from "@mui/icons-material/FormatAlignLeftOutlined";
import FormatAlignCenterOutlinedIcon from "@mui/icons-material/FormatAlignCenterOutlined";
import FormatAlignRightOutlinedIcon from "@mui/icons-material/FormatAlignRightOutlined";
import FormatAlignJustifyOutlinedIcon from "@mui/icons-material/FormatAlignJustifyOutlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import FormatListNumberedOutlinedIcon from "@mui/icons-material/FormatListNumberedOutlined";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import FormatIndentDecreaseOutlinedIcon from "@mui/icons-material/FormatIndentDecreaseOutlined";
import FormatIndentIncreaseOutlinedIcon from "@mui/icons-material/FormatIndentIncreaseOutlined";
import FormatColorTextOutlinedIcon from "@mui/icons-material/FormatColorTextOutlined";
import FormatColorFillOutlinedIcon from "@mui/icons-material/FormatColorFillOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import RedoOutlinedIcon from "@mui/icons-material/RedoOutlined";
import FormatClearOutlinedIcon from "@mui/icons-material/FormatClearOutlined";
import SubscriptOutlinedIcon from "@mui/icons-material/SubscriptOutlined";
import SuperscriptOutlinedIcon from "@mui/icons-material/SuperscriptOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import FormatQuoteOutlinedIcon from "@mui/icons-material/FormatQuoteOutlined";
import HorizontalRuleOutlinedIcon from "@mui/icons-material/HorizontalRuleOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import ArrowDropDownOutlinedIcon from "@mui/icons-material/ArrowDropDownOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_FAMILIES = ["Arial","Georgia","Helvetica","Impact","Roboto","Times New Roman","Trebuchet MS","Verdana"];
const FONT_SIZES    = ["8","9","10","11","12","14","16","18","20","24","28","32","36","48","72"];
const HEADING_OPTIONS = [
	{ label: "Normal text", value: "paragraph" },
	{ label: "Heading 1",   value: "h1" },
	{ label: "Heading 2",   value: "h2" },
	{ label: "Heading 3",   value: "h3" },
	{ label: "Heading 4",   value: "h4" },
	{ label: "Heading 5",   value: "h5" },
	{ label: "Heading 6",   value: "h6" },
];
const LINE_HEIGHTS = [
	{ label: "Single", value: "1" },
	{ label: "1.15",   value: "1.15" },
	{ label: "1.5",    value: "1.5" },
	{ label: "Double", value: "2" },
];
const TEXT_COLORS = [
	"#000000","#434343","#666666","#999999","#b7b7b7","#d9d9d9","#ffffff",
	"#ff0000","#ff4d00","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8",
	"#0000ff","#9900ff","#ff00ff","#e06666","#f6b26b","#ffd966","#93c47d",
	"#76a5af","#6fa8dc","#8e7cc3","#c27ba0",
];
const HIGHLIGHT_COLORS = [
	"#ffff00","#00ff00","#00ffff","#ff00ff",
	"#ff0000","#0000ff","#ff9900","#00b0f0",
];

// ─── Primitives ───────────────────────────────────────────────────────────────

function TBtn({ active, disabled, title, onClick, children }: {
	active?: boolean; disabled?: boolean; title?: string;
	onClick: () => void; children: React.ReactNode;
}) {
	return (
		<button type="button" title={title} disabled={disabled} onClick={onClick}
			className={[
				"inline-flex shrink-0 items-center justify-center rounded p-1 transition-colors",
				"text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300",
				"dark:text-neutral-300 dark:hover:bg-neutral-700 dark:active:bg-neutral-600",
				"disabled:pointer-events-none disabled:opacity-40",
				active ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white" : "",
			].filter(Boolean).join(" ")}
		>
			{children}
		</button>
	);
}

function Sep() {
	return <span className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden />;
}

function ColorPalette({ colors, onSelect, onClose }: {
	colors: string[]; onSelect: (c: string) => void; onClose: () => void;
}) {
	return (
		<div className="absolute z-[60] mt-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
			style={{ top: "100%", left: 0, minWidth: 160 }}>
			<div className="grid grid-cols-7 gap-1">
				{colors.map((c) => (
					<button key={c} type="button" title={c}
						onClick={() => { onSelect(c); onClose(); }}
						className="h-5 w-5 shrink-0 rounded-sm border border-neutral-300 transition-transform hover:scale-110 dark:border-neutral-600"
						style={{ backgroundColor: c }}
					/>
				))}
			</div>
		</div>
	);
}

// ─── Priority+ overflow hook ──────────────────────────────────────────────────

function useOverflow(itemCount: number) {
	const containerRef  = useRef<HTMLDivElement>(null);
	const itemRefs      = useRef<(HTMLDivElement | null)[]>([]);
	const storedWidths  = useRef<number[]>([]);
	const rafRef        = useRef<number>(0);
	const [visibleCount, setVisibleCount] = useState(itemCount);

	const calculate = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		// Re-measure any item whose stored width is still 0
		itemRefs.current.forEach((el, i) => {
			if (el && !storedWidths.current[i]) {
				storedWidths.current[i] = el.offsetWidth;
			}
		});

		// Subtract the container's own px-2 padding (8 px × 2 = 16 px).
		// Also budget 2 px gap-0.5 between every consecutive visible item.
		const PADDING_X = 16; // matches px-2 on the container
		const GAP      = 2;  // matches gap-0.5 on the container
		const containerW = container.clientWidth - PADDING_X;

		let used  = 0;
		let count = 0;

		for (let i = 0; i < itemCount; i++) {
			const w         = storedWidths.current[i] ?? 0;
			const gapBefore = count > 0 ? GAP : 0;
			if (used + gapBefore + w > containerW) break;
			used += gapBefore + w;
			count++;
		}

		setVisibleCount(count);
	}, [itemCount]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Initial measure after paint so items have layout
		rafRef.current = requestAnimationFrame(() => {
			itemRefs.current.forEach((el, i) => {
				if (el) storedWidths.current[i] = el.offsetWidth;
			});
			calculate();
		});

		const ro = new ResizeObserver(calculate);
		ro.observe(container);
		return () => {
			cancelAnimationFrame(rafRef.current);
			ro.disconnect();
		};
	}, [calculate]);

	const setRef = useCallback((i: number) => (el: HTMLDivElement | null) => {
		itemRefs.current[i] = el;
	}, []);

	return { containerRef, setRef, visibleCount };
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

export function Toolbar({ editor }: { editor: Editor }) {
	// Popover state
	const [fontSizeInput,   setFontSizeInput]   = useState("12");
	const [showTextColors,  setShowTextColors]  = useState(false);
	const [showHighlight,   setShowHighlight]   = useState(false);
	const [showLinkInput,   setShowLinkInput]   = useState(false);
	const [linkUrl,         setLinkUrl]         = useState("");
	const [showTablePicker, setShowTablePicker] = useState(false);
	const [showLineHeight,  setShowLineHeight]  = useState(false);
	const [hoveredCell,     setHoveredCell]     = useState<[number, number]>([0, 0]);
	const [showOverflow,    setShowOverflow]    = useState(false);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const overflowPanelRef = useRef<HTMLDivElement>(null);

	// Close overflow when clicking outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (overflowPanelRef.current && !overflowPanelRef.current.contains(e.target as Node)) {
				setShowOverflow(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// Heading state
	const activeHeading = (() => {
		for (let i = 1; i <= 6; i++) {
			if (editor.isActive("heading", { level: i })) return `h${i}`;
		}
		return "paragraph";
	})();

	const applyHeading = useCallback((value: string) => {
		if (value === "paragraph") editor.chain().focus().setParagraph().run();
		else {
			const level = parseInt(value.replace("h", ""), 10) as 1|2|3|4|5|6;
			editor.chain().focus().toggleHeading({ level }).run();
		}
	}, [editor]);

	const applyFontSize = useCallback((size: string) => {
		const s = size.trim();
		if (!s) return;
		setFontSizeInput(s);
		editor.chain().focus().setFontSize(`${s}pt`).run();
	}, [editor]);

	const insertLink = useCallback(() => {
		const url = linkUrl.trim();
		if (!url) editor.chain().focus().unsetLink().run();
		else editor.chain().focus().setLink({ href: url }).run();
		setShowLinkInput(false);
		setLinkUrl("");
	}, [editor, linkUrl]);

	const insertImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			editor.chain().focus().setImage({ src: ev.target?.result as string }).run();
		};
		reader.readAsDataURL(file);
		e.target.value = "";
	}, [editor]);

	const insertTable = useCallback((rows: number, cols: number) => {
		editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
		setShowTablePicker(false);
	}, [editor]);

	// ── Build items list ────────────────────────────────────────────────────

	const items = useMemo(() => [
		// ── History
		{
			key: "undo",
			el: <TBtn title="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
				<UndoOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "redo",
			el: <TBtn title="Redo (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
				<RedoOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{ key: "sep-1", isSep: true, el: <Sep /> },

		// ── Paragraph style
		{
			key: "heading",
			el: <select value={activeHeading} onChange={(e) => applyHeading(e.target.value)} title="Paragraph styles"
				className="h-7 shrink-0 cursor-pointer rounded border border-neutral-200 bg-white px-1 text-sm text-neutral-800 hover:bg-neutral-100 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
				style={{ minWidth: 110 }}>
				{HEADING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
			</select>,
		},
		{ key: "sep-2", isSep: true, el: <Sep /> },

		// ── Font family
		{
			key: "font-family",
			el: <select value={editor.getAttributes("textStyle").fontFamily ?? "Arial"}
				onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
				title="Font family"
				className="h-7 shrink-0 cursor-pointer rounded border border-neutral-200 bg-white px-1 text-sm text-neutral-800 hover:bg-neutral-100 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
				style={{ minWidth: 120 }}>
				{FONT_FAMILIES.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
			</select>,
		},

		// ── Font size stepper
		{
			key: "font-size",
			el: <div className="flex shrink-0 items-center rounded border border-neutral-200 dark:border-neutral-700">
				<button type="button" title="Decrease font size"
					className="px-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
					onClick={() => applyFontSize(String(Math.max(6, (parseInt(fontSizeInput, 10) || 12) - 1)))}>
					−
				</button>
				<select value={fontSizeInput} onChange={(e) => applyFontSize(e.target.value)}
					className="w-10 bg-transparent text-center text-sm text-neutral-800 focus:outline-none dark:text-neutral-200">
					{FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
				</select>
				<button type="button" title="Increase font size"
					className="px-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
					onClick={() => applyFontSize(String(Math.min(200, (parseInt(fontSizeInput, 10) || 12) + 1)))}>
					+
				</button>
			</div>,
		},
		{ key: "sep-3", isSep: true, el: <Sep /> },

		// ── Text marks
		{
			key: "bold",
			el: <TBtn title="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
				<FormatBoldOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "italic",
			el: <TBtn title="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
				<FormatItalicOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "underline",
			el: <TBtn title="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
				<FormatUnderlinedOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "strike",
			el: <TBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
				<StrikethroughSOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "subscript",
			el: <TBtn title="Subscript" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
				<SubscriptOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "superscript",
			el: <TBtn title="Superscript" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
				<SuperscriptOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{ key: "sep-4", isSep: true, el: <Sep /> },

		// ── Colors
		{
			key: "text-color",
			el: <div className="relative shrink-0">
				<TBtn title="Text color" active={showTextColors}
					onClick={() => { setShowTextColors((v) => !v); setShowHighlight(false); }}>
					<span className="flex flex-col items-center leading-none">
						<FormatColorTextOutlinedIcon sx={{ fontSize: 18 }} />
						<span className="mt-0.5 h-1 w-4 rounded-sm"
							style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }} />
					</span>
				</TBtn>
				{showTextColors && (
					<ColorPalette colors={TEXT_COLORS}
						onSelect={(c) => editor.chain().focus().setColor(c).run()}
						onClose={() => setShowTextColors(false)} />
				)}
			</div>,
		},
		{
			key: "highlight",
			el: <div className="relative shrink-0">
				<TBtn title="Highlight color" active={showHighlight}
					onClick={() => { setShowHighlight((v) => !v); setShowTextColors(false); }}>
					<span className="flex flex-col items-center leading-none">
						<FormatColorFillOutlinedIcon sx={{ fontSize: 18 }} />
						<span className="mt-0.5 h-1 w-4 rounded-sm"
							style={{ backgroundColor: editor.getAttributes("highlight").color || "#ffff00" }} />
					</span>
				</TBtn>
				{showHighlight && (
					<ColorPalette colors={HIGHLIGHT_COLORS}
						onSelect={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
						onClose={() => setShowHighlight(false)} />
				)}
			</div>,
		},
		{ key: "sep-5", isSep: true, el: <Sep /> },

		// ── Link
		{
			key: "link",
			el: <div className="relative shrink-0">
				<TBtn title="Insert link" active={editor.isActive("link") || showLinkInput}
					onClick={() => { setShowLinkInput((v) => !v); if (editor.isActive("link")) setLinkUrl(editor.getAttributes("link").href || ""); }}>
					<LinkOutlinedIcon sx={{ fontSize: 18 }} />
				</TBtn>
				{showLinkInput && (
					<div className="absolute z-[60] mt-1 flex w-64 gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
						style={{ top: "100%", left: 0 }}>
						<input autoFocus type="url" placeholder="https://" value={linkUrl}
							onChange={(e) => setLinkUrl(e.target.value)}
							onKeyDown={(e) => { if (e.key === "Enter") insertLink(); if (e.key === "Escape") setShowLinkInput(false); }}
							className="min-w-0 flex-1 rounded border border-neutral-200 px-2 py-1 text-sm focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-white" />
						<button type="button" onClick={insertLink}
							className="rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Apply</button>
					</div>
				)}
			</div>,
		},

		// ── Image
		{
			key: "image",
			el: <>
				<TBtn title="Insert image" onClick={() => imageInputRef.current?.click()}>
					<ImageOutlinedIcon sx={{ fontSize: 18 }} />
				</TBtn>
				<input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={insertImage} />
			</>,
		},
		{ key: "sep-6", isSep: true, el: <Sep /> },

		// ── Alignment
		{
			key: "align-left",
			el: <TBtn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
				<FormatAlignLeftOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "align-center",
			el: <TBtn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
				<FormatAlignCenterOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "align-right",
			el: <TBtn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
				<FormatAlignRightOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "align-justify",
			el: <TBtn title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
				<FormatAlignJustifyOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},

		// ── Line height
		{
			key: "line-height",
			el: <div className="relative shrink-0">
				<TBtn title="Line spacing" active={showLineHeight} onClick={() => setShowLineHeight((v) => !v)}>
					<span className="text-xs font-bold leading-none">≡↕</span>
					<ArrowDropDownOutlinedIcon sx={{ fontSize: 14 }} />
				</TBtn>
				{showLineHeight && (
					<div className="absolute z-[60] mt-1 rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
						style={{ top: "100%", left: 0, minWidth: 120 }}>
						{LINE_HEIGHTS.map((lh) => (
							<button key={lh.value} type="button"
								onClick={() => { editor.chain().focus().setLineHeight(lh.value).run(); setShowLineHeight(false); }}
								className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700">
								{lh.label}
							</button>
						))}
					</div>
				)}
			</div>,
		},
		{ key: "sep-7", isSep: true, el: <Sep /> },

		// ── Lists
		{
			key: "bullet-list",
			el: <TBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
				<FormatListBulletedOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "ordered-list",
			el: <TBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
				<FormatListNumberedOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "task-list",
			el: <TBtn title="Task list" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
				<CheckBoxOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "indent-decrease",
			el: <TBtn title="Decrease indent" onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
				<FormatIndentDecreaseOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "indent-increase",
			el: <TBtn title="Increase indent" onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
				<FormatIndentIncreaseOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{ key: "sep-8", isSep: true, el: <Sep /> },

		// ── Block elements
		{
			key: "blockquote",
			el: <TBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
				<FormatQuoteOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "code-block",
			el: <TBtn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
				<CodeOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
		{
			key: "hr",
			el: <TBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
				<HorizontalRuleOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},

		// ── Table
		{
			key: "table",
			el: <div className="relative shrink-0">
				<TBtn title="Insert table" active={showTablePicker || editor.isActive("table")}
					onClick={() => setShowTablePicker((v) => !v)}>
					<TableChartOutlinedIcon sx={{ fontSize: 18 }} />
				</TBtn>
				{showTablePicker && (
					<div className="absolute z-[60] mt-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
						style={{ top: "100%", left: 0 }}>
						<p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
							{hoveredCell[0] > 0 ? `${hoveredCell[0]} × ${hoveredCell[1]}` : "Select table size"}
						</p>
						<div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(8, 20px)" }}>
							{Array.from({ length: 64 }, (_, i) => {
								const row = Math.floor(i / 8) + 1;
								const col = (i % 8) + 1;
								const hl = row <= hoveredCell[0] && col <= hoveredCell[1];
								return (
									<button key={i} type="button"
										className={["h-5 w-5 rounded-sm border transition-colors",
											hl ? "border-primary-400 bg-primary-100 dark:border-primary-500 dark:bg-primary-900/40"
												: "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800",
										].join(" ")}
										onMouseEnter={() => setHoveredCell([row, col])}
										onClick={() => insertTable(row, col)} />
								);
							})}
						</div>
					</div>
				)}
			</div>,
		},
		{ key: "sep-9", isSep: true, el: <Sep /> },

		// ── Clear formatting
		{
			key: "clear",
			el: <TBtn title="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
				<FormatClearOutlinedIcon sx={{ fontSize: 18 }} />
			</TBtn>,
		},
	// eslint-disable-next-line react-hooks/exhaustive-deps
	], [
		editor, activeHeading, fontSizeInput,
		showTextColors, showHighlight, showLinkInput, linkUrl,
		showTablePicker, showLineHeight, hoveredCell,
		applyHeading, applyFontSize, insertLink, insertImage, insertTable,
	]);

	// ── Overflow calculation ─────────────────────────────────────────────────

	const { containerRef, setRef, visibleCount } = useOverflow(items.length);

	// Trim trailing separators from the visible section
	let effectiveVisible = visibleCount;
	while (effectiveVisible > 0 && items[effectiveVisible - 1]?.isSep) effectiveVisible--;

	// Trim leading separators from the overflow section
	let overflowStart = visibleCount;
	while (overflowStart < items.length && items[overflowStart]?.isSep) overflowStart++;

	const hasOverflow = overflowStart < items.length;

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="flex items-center border-b border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">

			{/*
			  * Items container: flex-1 + overflow-hidden.
			  * Being flex-1 means its clientWidth already excludes the sibling
			  * "…" button, so no extra space needs to be subtracted in calculate().
			  */}
			<div ref={containerRef} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden px-2 py-1">
				{items.map(({ key, el }, i) => (
					<div
						key={key}
						ref={setRef(i)}
						className="flex shrink-0 items-center"
						style={{ display: i >= effectiveVisible ? "none" : "flex" }}
					>
						{el}
					</div>
				))}
			</div>

			{/*
			  * "…" button lives OUTSIDE the overflow-hidden container so it is
			  * never clipped. It is always in the DOM (invisible when unneeded)
			  * so the items container always has a stable, correct flex-1 width.
			  */}
			<div
				ref={overflowPanelRef}
				className={[
					"relative shrink-0 py-1 pr-2",
					hasOverflow ? "" : "pointer-events-none opacity-0",
				].join(" ")}
			>
				<TBtn title="More options" active={showOverflow} onClick={() => setShowOverflow((v) => !v)}>
					<MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
				</TBtn>

				{showOverflow && hasOverflow && (
					<div
						className="absolute right-0 top-full z-50 mt-1 flex flex-wrap items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
						style={{ minWidth: 200, maxWidth: 320 }}
					>
						{items.slice(overflowStart).map(({ key, el, isSep }) =>
							isSep ? null : (
								<div key={key} className="flex shrink-0 items-center">
									{el}
								</div>
							)
						)}
					</div>
				)}
			</div>
		</div>
	);
}
