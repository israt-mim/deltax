import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";

type Tab = "draw" | "upload";

interface Props {
	onClose: () => void;
	onInsert: (src: string) => void;
}

export function SignatureInsertModal({ onClose, onInsert }: Props) {
	const [tab, setTab] = useState<Tab>("draw");
	const [uploadedSrc, setUploadedSrc] = useState<string | null>(null);
	const [hasDrawn, setHasDrawn] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isDrawing = useRef(false);
	const lastPoint = useRef<{ x: number; y: number } | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = e.currentTarget;
		const rect = canvas.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) * (canvas.width / rect.width),
			y: (e.clientY - rect.top) * (canvas.height / rect.height),
		};
	};

	const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
		const canvas = e.currentTarget;
		const rect = canvas.getBoundingClientRect();
		const touch = e.touches[0];
		return {
			x: (touch.clientX - rect.left) * (canvas.width / rect.width),
			y: (touch.clientY - rect.top) * (canvas.height / rect.height),
		};
	};

	const strokeTo = (pos: { x: number; y: number }) => {
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx || !lastPoint.current) return;
		ctx.beginPath();
		ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
		ctx.lineTo(pos.x, pos.y);
		ctx.strokeStyle = "#111827";
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.stroke();
		lastPoint.current = pos;
		setHasDrawn(true);
	};

	const stopDraw = () => {
		isDrawing.current = false;
		lastPoint.current = null;
	};

	const clearCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
		setHasDrawn(false);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => setUploadedSrc(ev.target?.result as string);
		reader.readAsDataURL(file);
		e.target.value = "";
	};

	const handleInsert = () => {
		if (tab === "draw") {
			if (!hasDrawn || !canvasRef.current) return;
			onInsert(canvasRef.current.toDataURL("image/png"));
		} else {
			if (!uploadedSrc) return;
			onInsert(uploadedSrc);
		}
	};

	const canInsert = tab === "draw" ? hasDrawn : !!uploadedSrc;

	return createPortal(
		<div
			style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 1rem" }}
		>
			<div className="w-full max-w-[480px] rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-700">
					<h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
						Insert Signature
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
					>
						<CloseOutlinedIcon sx={{ fontSize: 18 }} />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-neutral-200 px-5 dark:border-neutral-700">
					{(["draw", "upload"] as Tab[]).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setTab(t)}
							className={[
								"mr-6 flex items-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
								tab === t
									? "border-b-2 border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
									: "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
							].join(" ")}
						>
							{t === "draw" ? (
								<><DrawOutlinedIcon sx={{ fontSize: 15 }} /> Draw</>
							) : (
								<><CloudUploadOutlinedIcon sx={{ fontSize: 15 }} /> Upload</>
							)}
						</button>
					))}
				</div>

				{/* Tab content */}
				<div className="p-5">
					{tab === "draw" && (
						<div>
							<div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
								<canvas
									ref={canvasRef}
									width={440}
									height={140}
									className="w-full cursor-crosshair touch-none"
									style={{ display: "block" }}
									onMouseDown={(e) => {
										isDrawing.current = true;
										lastPoint.current = getMousePos(e);
									}}
									onMouseMove={(e) => {
										if (isDrawing.current) strokeTo(getMousePos(e));
									}}
									onMouseUp={stopDraw}
									onMouseLeave={stopDraw}
									onTouchStart={(e) => {
										e.preventDefault();
										isDrawing.current = true;
										lastPoint.current = getTouchPos(e);
									}}
									onTouchMove={(e) => {
										e.preventDefault();
										if (isDrawing.current) strokeTo(getTouchPos(e));
									}}
									onTouchEnd={stopDraw}
								/>
								{/* Baseline guide — CSS only, not baked into canvas data */}
								<div className="pointer-events-none absolute bottom-8 left-4 right-4 border-b border-dashed border-neutral-300 dark:border-neutral-600" />
								{!hasDrawn && (
									<p className="pointer-events-none absolute inset-0 flex items-end justify-center pb-9 text-xs text-neutral-400 dark:text-neutral-500">
										Sign here
									</p>
								)}
							</div>
							<div className="mt-1.5 flex justify-end">
								<button
									type="button"
									onClick={clearCanvas}
									className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
								>
									<DeleteOutlinedIcon sx={{ fontSize: 13 }} />
									Clear
								</button>
							</div>
						</div>
					)}

					{tab === "upload" && (
						<div>
							{uploadedSrc ? (
								<div className="relative rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-900">
									<img
										src={uploadedSrc}
										alt="Uploaded signature"
										className="mx-auto max-h-28 object-contain"
									/>
									<button
										type="button"
										onClick={() => setUploadedSrc(null)}
										className="absolute right-2 top-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
									>
										<DeleteOutlinedIcon sx={{ fontSize: 13 }} />
										Remove
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 py-12 text-neutral-500 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:border-primary-500 dark:hover:bg-primary-950/20"
								>
									<CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />
									<span className="text-sm font-medium">Click to upload signature image</span>
									<span className="text-xs text-neutral-400">PNG, JPG, SVG</span>
								</button>
							)}
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleFileChange}
							/>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3.5 dark:border-neutral-700">
					<button
						type="button"
						onClick={onClose}
						className="rounded px-3.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={!canInsert}
						onClick={handleInsert}
						className="rounded bg-primary-600 px-3.5 py-1.5 text-sm text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Insert
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
