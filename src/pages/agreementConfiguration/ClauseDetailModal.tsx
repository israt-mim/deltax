import { useMemo } from "react";
import { ApiError, useClauseDetailQuery, type AgreementClauseBrief } from "../../api";
import { Modal } from "../../components/base/Modal";
import { Skeleton } from "../../components/base/Skeleton";
import { Typography } from "../../components/base/Typography";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { ClauseDetailBody } from "../ClauseDetailPage";

export interface ClauseDetailModalProps {
	open: boolean;
	clauseId: string | null;
	clauseBrief?: AgreementClauseBrief | null;
	onClose: () => void;
}

function clauseModalTitle(brief: AgreementClauseBrief | null | undefined, loading: boolean): string {
	if (loading) return "Clause details";
	const title = brief?.title?.trim();
	if (title) return title;
	const displayId = brief?.displayId?.trim();
	if (displayId) return displayId;
	return "Clause details";
}

export function ClauseDetailModal({ open, clauseId, clauseBrief, onClose }: ClauseDetailModalProps) {
	const id = clauseId?.trim() ?? "";
	const clauseQuery = useClauseDetailQuery({ id: open && id ? id : undefined });

	const headerTitle = useMemo(() => {
		if (clauseQuery.data) {
			const general = clauseQuery.data.sections?.find((s) => s.name === "general")?.fields?.[0] as
				| { title?: string }
				| undefined;
			const t = typeof general?.title === "string" ? general.title.trim() : "";
			if (t) return t;
			return clauseQuery.data.displayId?.trim() || "Clause details";
		}
		return clauseModalTitle(clauseBrief, clauseQuery.isPending);
	}, [clauseBrief, clauseQuery.data, clauseQuery.isPending]);

	const errorMessage =
		clauseQuery.isError && clauseQuery.error
			? clauseQuery.error instanceof ApiError && clauseQuery.error.status === 404
				? "This clause could not be found."
				: formatUserFacingError(clauseQuery.error, "Could not load clause.")
			: null;

	return (
		<Modal
			open={open}
			onCancel={onClose}
			header={headerTitle}
			footer={null}
			width={960}
			styles={{ body: { maxHeight: "min(72vh, 720px)", overflowY: "auto" } }}
		>
			{!id ? (
				<Typography size="small" className="text-neutral-500 dark:text-neutral-400">
					Missing clause id.
				</Typography>
			) : clauseQuery.isPending ? (
				<div className="flex flex-col gap-4 py-2">
					<Skeleton className="h-7 w-2/3 max-w-md" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			) : errorMessage ? (
				<Typography size="small" className="text-error-600 dark:text-error-400">
					{errorMessage}
				</Typography>
			) : clauseQuery.data ? (
				<ClauseDetailBody detail={clauseQuery.data} />
			) : (
				<Typography size="small" className="text-neutral-500 dark:text-neutral-400">
					No clause data.
				</Typography>
			)}
		</Modal>
	);
}
