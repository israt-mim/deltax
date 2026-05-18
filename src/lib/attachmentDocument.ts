import type { AgreementAttachment } from "../api";
import { buildApiUrl } from "../api/client/config";

export function attachmentDisplayName(att: AgreementAttachment): string {
	return att.name?.trim() || att.originalFileName?.trim() || "Untitled";
}

export function isPdfFileName(fileName: string, contentType?: string | null): boolean {
	const mime = contentType?.trim().toLowerCase().split(";")[0] ?? "";
	if (mime === "application/pdf") return true;
	return fileName.trim().toLowerCase().endsWith(".pdf");
}

export function isPdfFile(file: File): boolean {
	return isPdfFileName(file.name, file.type);
}

function isPdfAttachment(att: AgreementAttachment): boolean {
	const name = att.originalFileName?.trim() || att.name?.trim() || "";
	return isPdfFileName(name, att.contentType);
}

export function canPreviewAttachment(att: AgreementAttachment): boolean {
	return att.kind === "file" && Boolean(att.attachmentUrl?.trim()) && isPdfAttachment(att);
}

/** Same-origin API path so session cookies are sent. */
export function resolveAttachmentFileUrl(att: AgreementAttachment): string {
	const raw = att.attachmentUrl?.trim() ?? "";
	if (!raw) return "";

	if (raw.startsWith("/")) {
		return buildApiUrl(raw);
	}

	try {
		const parsed = new URL(raw);
		return buildApiUrl(`${parsed.pathname}${parsed.search}`);
	} catch {
		return buildApiUrl(raw.startsWith("api/") ? `/${raw}` : raw);
	}
}

function bufferLooksLikePdf(buffer: ArrayBuffer): boolean {
	if (buffer.byteLength < 5) return false;
	const bytes = new Uint8Array(buffer, 0, 5);
	return (
		bytes[0] === 0x25 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x44 &&
		bytes[3] === 0x46 &&
		bytes[4] === 0x2d
	);
}

export async function fetchAgreementAttachmentPdfBlob(att: AgreementAttachment): Promise<Blob> {
	if (!canPreviewAttachment(att)) {
		throw new Error("Only PDF files can be previewed.");
	}

	const url = resolveAttachmentFileUrl(att);
	if (!url) {
		throw new Error("No document URL is available.");
	}

	const response = await fetch(url, { credentials: "include" });
	if (!response.ok) {
		if (response.status === 401) {
			throw new Error("Not authenticated. Sign in again to preview this file.");
		}
		throw new Error("Could not load the PDF.");
	}

	const buffer = await response.arrayBuffer();
	if (!bufferLooksLikePdf(buffer)) {
		throw new Error(
			"This file is not a valid PDF. Delete it and upload the document again."
		);
	}

	const headerType = response.headers.get("content-type")?.split(";")[0]?.trim();
	const mime =
		headerType && headerType !== "application/octet-stream"
			? headerType
			: "application/pdf";

	return new Blob([buffer], { type: mime });
}
