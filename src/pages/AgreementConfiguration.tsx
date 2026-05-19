import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { Button } from "../components/base/Button";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Card } from "../components/base/Card";
import { InfiniteTable } from "../components/base/InfiniteTable";
import { FloatingBar } from "../components/base/FloatingBar";
import { ConfirmModal } from "../components/base/ConfirmModal";
import { useColumns } from "../hooks/useColumns";
import { createStickyActionsColumn } from "../components/modules/settings/stickyActionsColumn";
import { NewAgreementConfigurationModal } from "./agreementConfiguration/NewAgreementConfigurationModal";
import {
	AgreementConfigRowMenu,
	agreementConfigRowMatchesSearch,
	agreementConfigToTableRow,
	agreementListScrollableColumnConfigs,
	agreementStatusColumnDef,
	type AgreementConfigTableRow,
} from "./agreementConfiguration/agreementListTableShared";
import {
	useAgreementConfigsInfiniteList,
	useBulkDeleteAgreementConfigsMutation,
	useDeleteAgreementConfigMutation,
} from "../api";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { SearchInput } from "../components/form-input/SearchInput";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { crumb } from "../lib/breadcrumb";

export type { AgreementConfigTableRow } from "./agreementConfiguration/agreementListTableShared";

const AGREEMENT_ACTIONS_COL_WIDTH = 44;

export const AgreementConfiguration = () => {
	usePageBreadcrumb([
		crumb("Configure", "/configure"),
		crumb("Agreements", "/configure/agreements"),
	]);

	const navigate = useNavigate();
	const scrollableColumns = useColumns(agreementListScrollableColumnConfigs);
	const [newAgreementModalOpen, setNewAgreementModalOpen] = useState(false);
	const [configPendingDelete, setConfigPendingDelete] = useState<AgreementConfigTableRow | null>(null);
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
		return () => window.clearTimeout(t);
	}, [searchInput]);

	const listQuery = useAgreementConfigsInfiniteList({
		sort: "-createdAt",
	});
	const bulkDeleteMutation = useBulkDeleteAgreementConfigsMutation();
	const deleteConfigMutation = useDeleteAgreementConfigMutation();

	const requestDeleteConfig = useCallback((row: AgreementConfigTableRow) => {
		setConfigPendingDelete(row);
	}, []);

	const columns = useMemo(
		() => [
			...scrollableColumns,
			agreementStatusColumnDef("before-actions", AGREEMENT_ACTIONS_COL_WIDTH),
			createStickyActionsColumn<AgreementConfigTableRow>((ctx) => (
				<AgreementConfigRowMenu row={ctx.row.original} onDeleteRequest={requestDeleteConfig} />
			)),
		],
		[scrollableColumns, requestDeleteConfig]
	);

	const rows = useMemo(
		() => listQuery.data?.pages.flatMap((p) => p.data.map(agreementConfigToTableRow)) ?? [],
		[listQuery.data]
	);

	const filteredRows = useMemo(() => {
		if (!debouncedSearch) return rows;
		return rows.filter((row) => agreementConfigRowMatchesSearch(row, debouncedSearch));
	}, [rows, debouncedSearch]);

	/** Load remaining pages while searching so taxonomy filter spans the full list. */
	useEffect(() => {
		if (!debouncedSearch) return;
		if (!listQuery.hasNextPage || listQuery.isFetchingNextPage) return;
		void listQuery.fetchNextPage();
	}, [debouncedSearch, listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const loadMore = useCallback(() => {
		if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
			void listQuery.fetchNextPage();
		}
	}, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery.fetchNextPage]);

	const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

	const clearSelection = useCallback(() => {
		setCheckedIds(new Set());
	}, []);

	const handleBulkDelete = useCallback(async () => {
		const ids = [...checkedIds];
		if (!ids.length || bulkDeleteMutation.isPending) return;
		try {
			const res = await bulkDeleteMutation.mutateAsync(ids);
			if (res.deletedCount === 0) {
				toast.info(res.message?.trim() || "No agreement configurations were deleted.");
				return;
			}
			if (res.deletedCount === res.requestedCount) {
				toast.success(
					`${res.deletedCount} agreement configuration${res.deletedCount === 1 ? "" : "s"} deleted.`
				);
			} else {
				toast.success(`${res.deletedCount} of ${res.requestedCount} agreement configurations deleted.`);
			}
			clearSelection();
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete agreement configurations."));
		}
	}, [checkedIds, bulkDeleteMutation, clearSelection]);

	const confirmDeleteConfig = useCallback(async () => {
		if (!configPendingDelete) return;
		try {
			await deleteConfigMutation.mutateAsync(configPendingDelete._id);
			toast.success("Agreement configuration deleted.");
			setCheckedIds((prev) => {
				const next = new Set(prev);
				next.delete(configPendingDelete._id);
				return next;
			});
			setConfigPendingDelete(null);
		} catch (e) {
			toast.error(formatUserFacingError(e, "Could not delete agreement configuration."));
		}
	}, [configPendingDelete, deleteConfigMutation]);

	const isInitialLoading = listQuery.isLoading && !listQuery.data;
	const isLoadingMore = listQuery.isFetchingNextPage;
	const hasMore = Boolean(listQuery.hasNextPage);

	return (
		<CardMain className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<Title>Agreements</Title>
				<Button size="md" onClick={() => setNewAgreementModalOpen(true)}>
					<AddOutlinedIcon sx={{ fontSize: 14 }} />
					New
				</Button>
			</div>

			{listQuery.isError && (
				<p className="text-sm text-error-500">
					{formatUserFacingError(listQuery.error, "Could not load agreements.")}{" "}
					<button
						type="button"
						className="font-medium text-primary-600 underline dark:text-primary-400"
						onClick={() => void listQuery.refetch()}
					>
						Retry
					</button>
				</p>
			)}

			<Card className="flex flex-col gap-3">
				<SearchInput
					placeholder="Search category, domain, type, subtype…"
					aria-label="Search agreement configurations by category, domain, type, or subtype"
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="max-w-md"
				/>

				<FloatingBar
					open={checkedIds.size > 0}
					selectedCount={checkedIds.size}
					onClearSelection={clearSelection}
					onDelete={() => void handleBulkDelete()}
					deletePending={bulkDeleteMutation.isPending}
				/>
				<InfiniteTable
					data={filteredRows}
					columns={columns}
					height="calc(100vh - 260px)"
					onLoadMore={loadMore}
					isLoading={isLoadingMore}
					isInitialLoading={isInitialLoading}
					hasMore={hasMore}
					onRowClick={(row) => void navigate(`/configure/agreements/${encodeURIComponent(row._id)}`)}
					checkboxConfig={{
						getRowId: (row) => row._id,
						checkedIds,
						setCheckedIds,
					}}
				/>
			</Card>

			<NewAgreementConfigurationModal
				open={newAgreementModalOpen}
				onClose={() => setNewAgreementModalOpen(false)}
			/>

			<ConfirmModal
				open={configPendingDelete !== null}
				onClose={() => setConfigPendingDelete(null)}
				title="Delete this agreement configuration?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				confirmDanger
				pending={deleteConfigMutation.isPending}
				onConfirm={confirmDeleteConfig}
			>
				<p className="mb-0">
					<span className="font-medium text-neutral-800 dark:text-neutral-100">
						{configPendingDelete?.displayId
							? `“${configPendingDelete.displayId}”`
							: "This configuration"}
					</span>{" "}
					will be removed. This cannot be undone.
				</p>
			</ConfirmModal>
		</CardMain>
	);
};
