import type { ReactNode } from "react";

type ProfileSettingsPanelProps = {
	title: string;
	subtitle: string;
	children: ReactNode;
	footer?: ReactNode;
};

export function ProfileSettingsPanel({ title, subtitle, children, footer }: ProfileSettingsPanelProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col rounded-xl border border-neutral-200 bg-white shadow-100 dark:border-black-600 dark:bg-black-800 dark:shadow-none dark:ring-1 dark:ring-white/5">
			<div className="border-b border-neutral-200 px-6 py-5 dark:border-black-600">
				<h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
				<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
			</div>
			<div className="flex flex-1 flex-col gap-6 px-6 py-6">{children}</div>
			{footer ? (
				<div className="flex justify-end border-t border-neutral-200 px-6 py-4 dark:border-black-600">
					{footer}
				</div>
			) : null}
		</div>
	);
}
