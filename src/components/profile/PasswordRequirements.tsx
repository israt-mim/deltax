import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { getPasswordChecks } from "../../lib/passwordValidation";

type PasswordRequirementsProps = {
	password: string;
};

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
	const checks = getPasswordChecks(password);
	const items = [
		{ key: "minLength", met: checks.minLength, label: "be at least 8 characters long" },
		{ key: "hasNumber", met: checks.hasNumber, label: "contain at least 1 number" },
		{ key: "hasSpecial", met: checks.hasSpecial, label: "contain at least 1 special character" },
	] as const;

	return (
		<div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-black-600 dark:bg-black-900/50">
			<p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Your Password Should:</p>
			<ul className="mt-2 space-y-1.5">
				{items.map((item) => (
					<li key={item.key} className="flex items-start gap-2 text-sm">
						{item.met ? (
							<CheckCircleOutlineIcon
								sx={{ fontSize: 18 }}
								className="mt-0.5 shrink-0 text-success-600 dark:text-success-400"
							/>
						) : (
							<RadioButtonUncheckedIcon
								sx={{ fontSize: 18 }}
								className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500"
							/>
						)}
						<span
							className={
								item.met
									? "text-neutral-700 dark:text-neutral-300"
									: "text-neutral-500 dark:text-neutral-400"
							}
						>
							{item.label}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
