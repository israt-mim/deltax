import cn from "classnames";

export type ProfileSettingsSection = "profile" | "general" | "password";

type ProfileSettingsNavProps = {
	active: ProfileSettingsSection;
	onChange: (section: ProfileSettingsSection) => void;
};

const ITEMS: { key: ProfileSettingsSection; label: string }[] = [
	{ key: "profile", label: "User Profile" },
	{ key: "password", label: "Password" },
	{ key: "general", label: "General Settings" },
];

export function ProfileSettingsNav({ active, onChange }: ProfileSettingsNavProps) {
	return (
		<nav className="flex w-full shrink-0 flex-col gap-1 sm:w-56 lg:w-60">
			{ITEMS.map((item) => {
				const isActive = active === item.key;
				return (
					<button
						key={item.key}
						type="button"
						onClick={() => onChange(item.key)}
						className={cn(
							"relative rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors",
							isActive
								? "bg-white text-success-700 shadow-100 dark:bg-black-800 dark:text-success-400 dark:shadow-none dark:ring-1 dark:ring-white/5"
								: "text-neutral-600 hover:bg-white/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-black-800/60 dark:hover:text-neutral-200"
						)}
					>
						{isActive ? (
							<span
								className="absolute bottom-2 left-0 top-2 w-1 rounded-r bg-success-500 dark:bg-success-400"
								aria-hidden
							/>
						) : null}
						{item.label}
					</button>
				);
			})}
		</nav>
	);
}
