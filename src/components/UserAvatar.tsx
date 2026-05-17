import { useEffect, useState } from "react";
import cn from "classnames";

export type UserAvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<UserAvatarSize, string> = {
	sm: "h-6 w-6 text-xs",
	md: "h-8 w-8 text-sm",
	lg: "h-11 w-11 text-base",
	xl: "h-16 w-16 text-xl",
};

export type UserAvatarVariant = "brand" | "neutral";

const VARIANT_CLASS: Record<UserAvatarVariant, string> = {
	brand: "bg-success-100 font-semibold text-success-800",
	neutral: "bg-neutral-200 font-semibold text-neutral-600 dark:bg-black-700 dark:text-neutral-300",
};

export interface UserAvatarProps {
	initials: string;
	profilePictureUrl?: string | null;
	size?: UserAvatarSize;
	variant?: UserAvatarVariant;
	alt?: string;
	className?: string;
}

export function UserAvatar({
	initials,
	profilePictureUrl,
	size = "md",
	variant = "brand",
	alt = "",
	className,
}: UserAvatarProps) {
	const dim = SIZE_CLASS[size];
	const imageUrl = profilePictureUrl?.trim() || null;
	const [imageFailed, setImageFailed] = useState(false);

	useEffect(() => {
		setImageFailed(false);
	}, [imageUrl]);

	const initialsNode = (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full",
				VARIANT_CLASS[variant],
				dim,
				className
			)}
			aria-hidden={alt ? undefined : true}
		>
			{initials}
		</span>
	);

	if (!imageUrl || imageFailed) {
		return initialsNode;
	}

	return (
		<img
			src={imageUrl}
			alt={alt}
			className={cn("inline-flex shrink-0 rounded-full object-cover", dim, className)}
			onError={() => setImageFailed(true)}
		/>
	);
}
