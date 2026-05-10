import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { toast } from "react-toastify";
import { Button } from "../components/base/Button";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Card } from "../components/base/Card";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { useColumns } from "../hooks/useColumns";
import { NewContractModal } from "./agreementConfiguration/NewContractModal";
import {
	agreementListItemToListPageRow,
	agreementListPageColumnConfigs,
	type AgreementListPageRow,
} from "./agreementConfiguration/agreementListPageTable";
import { useAgreementsInfiniteList } from "../api";
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

	const columns = useColumns(agreementListPageColumnConfigs);
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

	const isInitialLoading = listQuery.isLoading && !listQuery.data;
	const isLoadingMore = listQuery.isFetchingNextPage;
	const hasMore = Boolean(listQuery.hasNextPage);

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

				<InfiniteTable<AgreementListPageRow>
					data={rows}
					columns={columns}
					height="calc(100vh - 240px)"
					onLoadMore={loadMore}
					isLoading={isLoadingMore}
					isInitialLoading={isInitialLoading}
					hasMore={hasMore}
					onRowClick={(row) => void navigate(`/configure/agreements/${encodeURIComponent(row._id)}`)}
					emptyMessage="No agreements match your filters."
				/>
			</Card>

			<NewContractModal
				open={newAgreementModalOpen}
				onClose={() => setNewAgreementModalOpen(false)}
				categoryId={agreementCategory}
				domainId={agreementDomain}
			/>
		</CardMain>
	);
}
