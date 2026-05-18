import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

const CLOSE_MS = 260;
const FLYOUT_Z_CATEGORIES = 200;
const FLYOUT_Z_DOMAINS = 201;

interface AgreementSidebarNavRowProps {
	expanded: boolean;
}

export function AgreementSidebarNavRow({ expanded }: AgreementSidebarNavRowProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const categories = useAppSelector((s) => s.agreementDetails.data?.categories ?? []);

	const triggerRef = useRef<HTMLDivElement>(null);
	const closeTimerRef = useRef<number | null>(null);
	const categoriesPanelRef = useRef<HTMLDivElement>(null);
	const categoryBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
	const [hoverCategoryId, setHoverCategoryId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [domainPopoverLayout, setDomainPopoverLayout] = useState<{ top: number; left: number } | null>(
		null
	);

	const isAgreementRoute = location.pathname.startsWith("/agreements");

	const filteredCategories = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return categories;
		return categories.filter((c) => (c.name ?? "").toLowerCase().includes(q));
	}, [categories, search]);

	const hoverCategory = useMemo(
		() => categories.find((c) => c._id === hoverCategoryId) ?? null,
		[categories, hoverCategoryId]
	);

	const cancelClose = useCallback(() => {
		if (closeTimerRef.current != null) {
			window.clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}
	}, []);

	const scheduleClose = useCallback(() => {
		cancelClose();
		closeTimerRef.current = window.setTimeout(() => {
			setOpen(false);
			setHoverCategoryId(null);
			setSearch("");
			setDomainPopoverLayout(null);
			closeTimerRef.current = null;
		}, CLOSE_MS);
	}, [cancelClose]);

	const updateAnchor = useCallback(() => {
		const el = triggerRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		setAnchor({ top: r.top, left: r.right });
	}, []);

	const updateDomainPopoverLayout = useCallback(() => {
		const panel = categoriesPanelRef.current;
		const id = hoverCategoryId;
		if (!open || !panel || !id) {
			setDomainPopoverLayout(null);
			return;
		}
		const btn = categoryBtnRefs.current.get(id);
		if (!btn) {
			setDomainPopoverLayout(null);
			return;
		}
		const pr = panel.getBoundingClientRect();
		const br = btn.getBoundingClientRect();
		// Slight overlap so pointer can move from category row into domains without a dead gap
		setDomainPopoverLayout({ top: br.top, left: pr.right - 2 });
	}, [open, hoverCategoryId]);

	useLayoutEffect(() => {
		if (!open) return;
		updateAnchor();
	}, [open, expanded, updateAnchor]);

	useLayoutEffect(() => {
		updateDomainPopoverLayout();
	}, [open, hoverCategoryId, filteredCategories, updateDomainPopoverLayout]);

	useEffect(() => {
		if (!open) return;
		const onScrollOrResize = () => {
			updateAnchor();
			updateDomainPopoverLayout();
		};
		window.addEventListener("scroll", onScrollOrResize, true);
		window.addEventListener("resize", onScrollOrResize);
		return () => {
			window.removeEventListener("scroll", onScrollOrResize, true);
			window.removeEventListener("resize", onScrollOrResize);
		};
	}, [open, updateAnchor, updateDomainPopoverLayout]);

	useEffect(() => {
		if (!open) return;
		const panel = categoriesPanelRef.current;
		if (!panel) return;
		const onScroll = () => updateDomainPopoverLayout();
		panel.addEventListener("scroll", onScroll, { passive: true });
		return () => panel.removeEventListener("scroll", onScroll);
	}, [open, updateDomainPopoverLayout]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				cancelClose();
				setOpen(false);
				setHoverCategoryId(null);
				setSearch("");
				setDomainPopoverLayout(null);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, cancelClose]);

	const openMenu = useCallback(() => {
		cancelClose();
		updateAnchor();
		setHoverCategoryId(null);
		setDomainPopoverLayout(null);
		setOpen(true);
	}, [cancelClose, updateAnchor]);

	useEffect(() => {
		if (!open || !hoverCategoryId) return;
		if (!filteredCategories.some((c) => c._id === hoverCategoryId)) {
			setHoverCategoryId(null);
			setDomainPopoverLayout(null);
		}
	}, [open, filteredCategories, hoverCategoryId]);

	const handleDomainClick = (categoryId: string, domainId: string) => {
		void navigate(
			`/agreements/${encodeURIComponent(categoryId)}/${encodeURIComponent(domainId)}`
		);
		cancelClose();
		setOpen(false);
		setHoverCategoryId(null);
		setSearch("");
		setDomainPopoverLayout(null);
	};

	const onCategoryEnter = (id: string) => {
		cancelClose();
		setHoverCategoryId(id);
	};

	const categoriesPopover =
		open && anchor
			? createPortal(
					<div
						className="fixed w-max"
						style={{
							top: anchor.top,
							left: anchor.left - 10,
							zIndex: FLYOUT_Z_CATEGORIES,
							paddingLeft: 10,
						}}
						onMouseEnter={cancelClose}
						onMouseLeave={scheduleClose}
					>
						<div
							ref={categoriesPanelRef}
							className="h-fit max-h-[calc(100vh-5rem)] w-40 overflow-y-auto overflow-x-hidden rounded-lg border border-primary-700 bg-primary-600 p-2 shadow-xl"
						>
							<div className="mb-2 flex items-center gap-1.5 rounded-md border border-white/25 bg-primary-700 px-2 py-1.5">
								<SearchOutlinedIcon sx={{ fontSize: 16 }} className="shrink-0 text-white/70" />
								<input
									type="search"
									aria-label="Search categories"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search categories…"
									className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
									autoComplete="off"
								/>
							</div>
							<div className="py-0.5">
								{filteredCategories.length === 0 ? (
									<p className="px-2 py-3 text-center text-xs text-white/70">No categories</p>
								) : (
									filteredCategories.map((cat) => {
										const active = cat._id === hoverCategoryId;
										return (
											<button
												key={cat._id}
												ref={(el) => {
													if (el) categoryBtnRefs.current.set(cat._id, el);
													else categoryBtnRefs.current.delete(cat._id);
												}}
												type="button"
												className={`flex w-full items-center gap-0.5 rounded px-2 py-1.5 text-left text-xs transition-colors ${
													active
														? "bg-white/20 text-white"
														: "text-white/90 hover:bg-white/15 hover:text-white"
												}`}
												onMouseEnter={() => onCategoryEnter(cat._id)}
												onFocus={() => onCategoryEnter(cat._id)}
											>
												<span className="min-w-0 flex-1 truncate">{cat.name}</span>
												<ChevronRightIcon sx={{ fontSize: 16 }} className="shrink-0 text-white/80" />
											</button>
										);
									})
								)}
							</div>
						</div>
					</div>,
					document.body
				)
			: null;

	const domainsPopover =
		open && hoverCategoryId && hoverCategory && domainPopoverLayout
			? createPortal(
					<div
						className="fixed w-40"
						style={{
							top: domainPopoverLayout.top,
							left: domainPopoverLayout.left,
							zIndex: FLYOUT_Z_DOMAINS,
						}}
						onMouseEnter={cancelClose}
						onMouseLeave={scheduleClose}
					>
						<div className="h-fit max-h-[min(calc(100vh-5rem),480px)] overflow-y-auto overflow-x-hidden rounded-lg border border-primary-700 bg-primary-600 p-2 shadow-xl">
							<div className="h-fit py-0.5">
								{hoverCategory.domains.length === 0 ? (
									<p className="px-2 py-3 text-center text-xs text-white/70">No domains</p>
								) : (
									hoverCategory.domains.map((d) => {
										const count = d.types?.length ?? 0;
										return (
											<button
												key={d._id}
												type="button"
												className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-xs text-white/90 transition-colors hover:bg-white/15 hover:text-white"
												onClick={() => handleDomainClick(hoverCategory._id, d._id)}
											>
												<span className="min-w-0 flex-1 truncate">{d.name}</span>
												<span className="shrink-0 rounded bg-primary-800/80 px-1.5 py-0.5 text-[10px] tabular-nums text-white/90">
													{count}
												</span>
											</button>
										);
									})
								)}
							</div>
						</div>
					</div>,
					document.body
				)
			: null;

	return (
		<>
			<div
				ref={triggerRef}
				role="presentation"
				className={`flex cursor-default items-center gap-3 rounded no-underline transition-colors ${
					expanded ? "px-2 py-1.5" : "justify-center px-2 py-1.5"
				} ${
					isAgreementRoute
						? "bg-white/20 text-white"
						: "text-white/70 hover:bg-white/20 hover:text-white"
				}`}
				title={!expanded ? "Agreement" : undefined}
				onMouseEnter={() => {
					openMenu();
				}}
				onMouseLeave={scheduleClose}
			>
				<span className="flex shrink-0 items-center justify-center">
					<DescriptionOutlinedIcon sx={{ fontSize: 20 }} />
				</span>
				{expanded ? <span className="whitespace-nowrap text-sm">Agreement</span> : null}
			</div>
			{categoriesPopover}
			{domainsPopover}
		</>
	);
}
