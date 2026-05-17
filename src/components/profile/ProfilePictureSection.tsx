import { useRef, type ChangeEvent } from "react";
import { toast } from "react-toastify";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import { useDeleteUserAvatarMutation, useUploadUserAvatarMutation } from "../../api/hooks/users";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../base/Button";
import { UserAvatar } from "../UserAvatar";
import { formatUserFacingError } from "../../lib/formatUserFacingError";
import { userInitials } from "../../lib/userDisplay";
import { AVATAR_ACCEPT, validateAvatarFile } from "../../lib/userAvatar";

export function ProfilePictureSection() {
	const { user, updateSessionUser } = useAuth();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const uploadAvatar = useUploadUserAvatarMutation();
	const deleteAvatar = useDeleteUserAvatarMutation();

	if (!user) return null;

	const initials = userInitials(user);
	const avatarPending = uploadAvatar.isPending || deleteAvatar.isPending;
	const hasAvatar = Boolean(user.profilePictureUrl?.trim());

	const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;

		const validationError = validateAvatarFile(file);
		if (validationError) {
			toast.error(validationError);
			return;
		}

		try {
			const updated = await uploadAvatar.mutateAsync({ id: user._id, file });
			updateSessionUser(updated);
			toast.success("Profile picture updated");
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not upload profile picture."));
		}
	};

	const handleRemove = async () => {
		if (!hasAvatar) return;
		try {
			const updated = await deleteAvatar.mutateAsync(user._id);
			updateSessionUser(updated);
			toast.success("Profile picture removed");
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not remove profile picture."));
		}
	};

	return (
		<div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 dark:border-black-600 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-center gap-4">
				<UserAvatar
					initials={initials}
					profilePictureUrl={user.profilePictureUrl}
					size="xl"
					variant="neutral"
					alt={`${initials} profile`}
				/>
				<div>
					<p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Profile Picture</p>
					<p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
						JPEG, PNG, WebP, or GIF. Max 5 MB.
					</p>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<input
					ref={fileInputRef}
					type="file"
					accept={AVATAR_ACCEPT}
					className="sr-only"
					aria-hidden
					onChange={(e) => void handleFileChange(e)}
				/>
				<Button
					type="button"
					appearance="outlined"
					status="secondary-neutral"
					className="shrink-0"
					disabled={avatarPending}
					loading={uploadAvatar.isPending}
					onClick={() => fileInputRef.current?.click()}
				>
					<span className="flex items-center gap-2">
						<FileUploadOutlinedIcon sx={{ fontSize: 18 }} />
						{hasAvatar ? "Replace" : "Upload"}
					</span>
				</Button>
				{hasAvatar ? (
					<Button
						type="button"
						appearance="outlined"
						status="secondary-neutral"
						className="shrink-0"
						disabled={avatarPending}
						loading={deleteAvatar.isPending}
						onClick={() => void handleRemove()}
					>
						<span className="flex items-center gap-2">
							<DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
							Remove
						</span>
					</Button>
				) : null}
			</div>
		</div>
	);
}
