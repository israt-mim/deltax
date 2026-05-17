/** Client-side rules aligned with POST /api/users/:id/avatar. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const AVATAR_ALLOWED_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]);

export function validateAvatarFile(file: File): string | null {
	if (!AVATAR_ALLOWED_MIME_TYPES.has(file.type)) {
		return "Only JPEG, PNG, WebP, and GIF images are allowed";
	}
	if (file.size > AVATAR_MAX_BYTES) {
		return "Image must be 5 MB or smaller";
	}
	return null;
}
