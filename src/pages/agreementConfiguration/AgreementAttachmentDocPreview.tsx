import { useEffect, useState } from "react";
import type { AgreementAttachment } from "../../api";
import {
	attachmentDisplayName,
	fetchAgreementAttachmentPdfBlob,
} from "../../lib/attachmentDocument";

export interface AgreementAttachmentDocPreviewProps {
	attachment: AgreementAttachment;
}

export function AgreementAttachmentDocPreview({ attachment }: AgreementAttachmentDocPreviewProps) {
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [blobUrl, setBlobUrl] = useState<string | null>(null);

	const displayName = attachmentDisplayName(attachment);

	useEffect(() => {
		let cancelled = false;
		let objectUrl: string | null = null;

		setStatus("loading");
		setErrorMessage(null);
		setBlobUrl(null);

		void (async () => {
			try {
				const blob = await fetchAgreementAttachmentPdfBlob(attachment);
				if (cancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setBlobUrl(objectUrl);
				setStatus("ready");
			} catch (err) {
				if (cancelled) return;
				setStatus("error");
				setErrorMessage(err instanceof Error ? err.message : "Could not load preview.");
			}
		})();

		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [attachment]);

	useEffect(() => {
		return () => {
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [blobUrl]);

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
			{status === "loading" ? (
				<p className="text-sm text-neutral-500 dark:text-neutral-400">Loading preview…</p>
			) : null}
			{status === "error" ? (
				<p className="text-sm text-error-600 dark:text-error-400">{errorMessage}</p>
			) : null}
			{status === "ready" && blobUrl ? (
				<iframe
					title={displayName}
					src={blobUrl}
					className="min-h-0 flex-1 w-full rounded border border-neutral-200 dark:border-black-600"
				/>
			) : null}
		</div>
	);
}
