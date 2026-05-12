import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { toast } from "react-toastify";
import { Button } from "../components/base/Button";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Card } from "../components/base/Card";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { FloatingBar } from "../components/base/FloatingBar";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { useColumns } from "../hooks/useColumns";
import { NewContractModal } from "./agreementConfiguration/NewContractModal";
import {
	agreementListItemToListPageRow,
	agreementListMenuColumnConfig,
	agreementListPageColumnConfigs,
	type AgreementListPageRow,
} from "./agreementConfiguration/agreementListPageTable";
import { useAgreementsInfiniteList, useBulkDeleteAgreementsMutation } from "../api";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { useAppSelector } from "../store/hooks";

export type { AgreementListPageRow } from "./agreementConfiguration/agreementListPageTable";

export function AgreementListPage() {
	const navigate = useNavigate();
	const { categoryId: categoryIdParam, domainId: domainIdParam } = useParams<{
		categoryId?: string;
		domainId?: string;
	}>();
	const [searchParams] = useSearchParams();
	const categories = useAppSelector((s) => s.agreementDetails.data?.categories ?? []);

	const agreementCategory =
		categoryIdParam?.trim() || searchParams.get("agreement_category")?.trim() || undefined;
	const agreementDomain =
		domainIdParam?.trim() || searchParams.get("agreement_domain")?.trim() || undefined;

	const pageTitle = useMemo(() => {
		const domainId = agreementDomain?.trim();
		if (!domainId) return "Agreements";
		for (const cat of categories) {
			const domain = cat.domains?.find((d) => d._id === domainId);
			if (domain?.name?.trim()) return domain.name.trim();
		}
		return "Agreements";
	}, [categories, agreementDomain]);

	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
	const [agreementPendingDelete, setAgreementPendingDelete] = useState<AgreementListPageRow | null>(null);
	const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

	const requestDeleteAgreement = useCallback((row: AgreementListPageRow) => {
		setAgreementPendingDelete(row);
	}, []);

	const columnConfigs = useMemo(
		() => [...agreementListPageColumnConfigs, agreementListMenuColumnConfig(requestDeleteAgreement)],
		[requestDeleteAgreement]
	);
	const columns = useColumns(columnConfigs);

	const [newAgreementModalOpen, setNewAgreementModalOpen] = useState(false);
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
		return () => window.clearTimeout(t);
	}, [searchInput]);

	const listQuery = useAgreementsInfiniteList({
		search: debouncedSearch || undefined,
		sort: "-createdAt",
		agreement_category: agreementCategory,
		agreement_domain: agreementDomain,
	});
	const bulkDeleteMutation = useBulkDeleteAgreementsMutation();

	useEffect(() => {
		if (!listQuery.isError || !listQuery.error) return;
		toast.error(formatUserFacingError(listQuery.error, "Could not load agreements."), {
			toastId: `agreements-list-error-${agreementCategory ?? "all"}-${agreementDomain ?? "all"}`,
		});
	}, [listQuery.isError, listQuery.error, agreementCategory, agreementDomain]);

	const rows = useMemo(
		() => listQuery.data?.pages.flatMap((p) => p.data.map(agreementListItemToListPageRow)) ?? [],
		[listQuery.data]
	);

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const clearSelection = useCallback(() => {
		setCheckedIds(new Set());
	}, []);

	const runBulkDelete = useCallback(
		async (ids: string[]) => {
			if (!ids.length) return;
			try {
				const res = await bulkDeleteMutation.mutateAsync(ids);
				if (res.deletedCount === 0) {
					toast.info(res.message?.trim() || "No agreements were deleted.");
				} else if (res.deletedCount < res.requestedCount) {
					toast.success(
						`${res.deletedCount} of ${res.requestedCount} agreement${res.requestedCount === 1 ? "" : "s"} deleted. Some were already removed.`
					);
				} else {
					toast.success(`${res.deletedCount} agreement${res.deletedCount === 1 ? "" : "s"} deleted.`);
				}
				setCheckedIds((prev) => {
					const next = new Set(prev);
					for (const id of ids) next.delete(id);
					return next;
				});
				setBulkDeleteConfirmOpen(false);
				setAgreementPendingDelete((cur) => (cur && ids.includes(cur._id) ? null : cur));
			} catch (e) {
				toast.error(formatUserFacingError(e, "Could not delete agreements."));
			}
		},
		[bulkDeleteMutation]
	);

	const handleBulkDeleteConfirm = useCallback(async () => {
		const ids = [...checkedIds];
		await runBulkDelete(ids);
	}, [checkedIds, runBulkDelete]);

	const confirmDeleteSingleAgreement = useCallback(async () => {
		if (!agreementPendingDelete) return;
		await runBulkDelete([agreementPendingDelete._id]);
	}, [agreementPendingDelete, runBulkDelete]);

	const isInitialLoading = listQuery.isLoading && !listQuery.data;
	const isLoadingMore = listQuery.isFetchingNextPage;
	const hasMore = Boolean(listQuery.hasNextPage);

	const bulkSelectedCount = checkedIds.size;

	return (
		<CardMain className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-4">
				<Title>{pageTitle}</Title>
				<Button size="md" status="primary" onClick={() => setNewAgreementModalOpen(true)}>
					<AddOutlinedIcon sx={{ fontSize: 14 }} />
					New
				</Button>
			</div>

			<Card className="flex flex-col gap-3">
				<div className="relative max-w-xl">
					<SearchOutlinedIcon
						className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-neutral-400"
						sx={{ fontSize: 18 }}
					/>
					<input
						type="search"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						placeholder="Search (use * as a wildcard)"
						className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 dark:border-black-600 dark:bg-black-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-primary-500"
						autoComplete="off"
					/>
				</div>

				<FloatingBar
					open={bulkSelectedCount > 0}
					selectedCount={bulkSelectedCount}
					onClearSelection={clearSelection}
					items={
						<button
							type="button"
							onClick={() => setBulkDeleteConfirmOpen(true)}
							className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-red-200 transition-colors hover:bg-white/10 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
						>
							<DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
							Delete
						</button>
					}
				/>

				<InfiniteTable<AgreementListPageRow>
					data={rows}
					columns={columns}
					height="calc(100vh - 280px)"
					onLoadMore={loadMore}
					isLoading={isLoadingMore}
					isInitialLoading={isInitialLoading}
					hasMore={hasMore}
					onRowClick={(row) => void navigate(`/agreements/${encodeURIComponent(row._id)}`)}
					emptyMessage="No agreements match your filters."
					checkboxConfig={{
						getRowId: (row) => row._id,
						checkedIds,
						setCheckedIds,
					}}
				/>
			</Card>

			<ConfirmModal
				open={bulkDeleteConfirmOpen}
				onClose={() => setBulkDeleteConfirmOpen(false)}
				title={`Delete ${bulkSelectedCount} agreement${bulkSelectedCount === 1 ? "" : "s"}?`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={bulkDeleteMutation.isPending}
				onConfirm={() => void handleBulkDeleteConfirm()}
			>
				<p className="mb-0 text-neutral-700 dark:text-neutral-300">
					Selected agreements will be permanently removed. This cannot be undone.
				</p>
			</ConfirmModal>

			<ConfirmModal
				open={agreementPendingDelete !== null}
				onClose={() => setAgreementPendingDelete(null)}
				title="Delete this agreement?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={bulkDeleteMutation.isPending}
				onConfirm={() => void confirmDeleteSingleAgreement()}
			>
				<p className="mb-0 text-neutral-700 dark:text-neutral-300">
					<span className="font-medium text-neutral-900 dark:text-white">
						{agreementPendingDelete?.displayName && agreementPendingDelete.displayName !== "—"
							? `“${agreementPendingDelete.displayName}”`
							: agreementPendingDelete?.displayId ?? "This agreement"}
					</span>{" "}
					will be permanently deleted. This cannot be undone.
				</p>
			</ConfirmModal>

			<NewContractModal
				open={newAgreementModalOpen}
				onClose={() => setNewAgreementModalOpen(false)}
				categoryId={agreementCategory}
				domainId={agreementDomain}
			/>
		</CardMain>
	);
}
