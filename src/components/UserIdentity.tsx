import cn from "classnames";
import { UserAvatar, type UserAvatarSize, type UserAvatarVariant } from "./UserAvatar";
import {
	apiUserDisplayName,
	apiUserProfilePictureUrl,
	userInitialsFromFields,
	type ApiUserRef,
} from "../lib/userDisplay";

export interface UserIdentityProps {
	user: ApiUserRef | null | undefined;
	size?: UserAvatarSize;
	variant?: UserAvatarVariant;
	/** Shown when user is missing or has no displayable name. */
	emptyLabel?: string;
	className?: string;
}

export function UserIdentity({
	user,
	size = "sm",
	variant = "neutral",
	emptyLabel = "—",
	className,
}: UserIdentityProps) {
	const name = apiUserDisplayName(user);
	if (!user || name === "—") {
		return <span className={cn("text-neutral-400 dark:text-neutral-500", className)}>{emptyLabel}</span>;
	}

	const initials = userInitialsFromFields(user);
	const profilePictureUrl = apiUserProfilePictureUrl(user);

	return (
		<span className={cn("flex min-w-0 items-center gap-2", className)}>
			<UserAvatar
				initials={initials}
				profilePictureUrl={profilePictureUrl}
				size={size}
				variant={variant}
				alt=""
			/>
			<span className="truncate text-inherit">{name}</span>
		</span>
	);
}
