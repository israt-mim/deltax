import type { ReactNode } from "react";
import cn from "classnames";
import { Switch } from "antd";

export interface FormToggleFieldProps {
	label: string;
	checked: boolean;
	onChange: (val: boolean) => void;
	icon?: ReactNode;
}

const switchCheckedClass = (checked: boolean) => cn(checked && "!bg-primary-500");

/** Matches `Switch size="small"`: track + thumb; icon sits in the thumb like the default knob. */
function SwitchWithIconInThumb({
	checked,
	onChange,
	icon,
}: {
	checked: boolean;
	onChange: (val: boolean) => void;
	icon: ReactNode;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			className={cn(
				"relative box-border h-4 w-7 shrink-0 cursor-pointer rounded-full border-0 p-0.5 transition-colors",
				"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
				checked ? "bg-primary-500" : "bg-neutral-200 dark:bg-black-500"
			)}
		>
			<span
				aria-hidden
				className={cn(
					"absolute left-0.5 top-1/2 flex size-3 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm",
					"transition-transform duration-200 ease-in-out",
					checked && "translate-x-3"
				)}
			>
				<span className="flex size-3 items-center justify-center [&_svg]:!size-2.5">{icon}</span>
			</span>
		</button>
	);
}

export const FormToggleField = ({ label, checked, onChange, icon }: FormToggleFieldProps) => (
	<div className="flex flex-col gap-1.5">
		<span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
		<div className="flex items-center gap-2">
			{icon ? (
				<SwitchWithIconInThumb checked={checked} onChange={onChange} icon={icon} />
			) : (
				<Switch
					size="small"
					checked={checked}
					onChange={onChange}
					className={switchCheckedClass(checked)}
				/>
			)}
			<span className="text-sm text-neutral-700 dark:text-neutral-300">
				{checked ? "Yes" : "No"}
			</span>
		</div>
	</div>
);
