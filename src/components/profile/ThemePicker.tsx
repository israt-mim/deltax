import { useState } from "react";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import { Popover } from "antd";
import { APP_THEME_NAMES, getThemeShades, type AppThemeName } from "../../constants/appThemes";
import { useAppTheme } from "../../context/AppThemeContext";
import { ThemeSwatch } from "./ThemeSwatch";

type ThemePickerProps = {
	value: AppThemeName;
	onChange: (theme: AppThemeName) => void;
};

export function ThemePicker({ value, onChange }: ThemePickerProps) {
	const [open, setOpen] = useState(false);
	const { isDark } = useAppTheme();
	const selectedShades = getThemeShades(value);

	const content = (
		<div className="theme-picker-popover-content w-[min(100vw-32px,440px)] p-3">
			<div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
				{APP_THEME_NAMES.map((name) => {
					const selected = name === value;
					const shades = getThemeShades(name);
					return (
						<button
							key={name}
							type="button"
							onClick={() => {
								onChange(name);
								setOpen(false);
							}}
							className={`flex flex-col items-center gap-2 rounded-xl p-2.5 transition-colors ${
								selected
									? "bg-neutral-100 ring-1 ring-neutral-200 dark:bg-black-600 dark:ring-primary-800/70"
									: "hover:bg-neutral-50 dark:hover:bg-black-600/80"
							}`}
						>
							<span className="relative">
								<ThemeSwatch shades={shades} size="md" />
								{selected ? (
									<span className="absolute inset-0 flex items-center justify-center">
										<CheckIcon
											sx={{ fontSize: 18 }}
											className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
										/>
									</span>
								) : null}
							</span>
							<span
								className={`max-w-full truncate text-center text-xs leading-tight ${
									selected
										? "font-semibold text-neutral-900 dark:text-neutral-50"
										: "font-medium text-neutral-600 dark:text-neutral-300"
								}`}
							>
								{name}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className="flex flex-col gap-1">
			<span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
				Theme <span className="text-error-500">*</span>
			</span>
			<Popover
				open={open}
				onOpenChange={setOpen}
				trigger="click"
				placement="bottomLeft"
				color={isDark ? "#141414" : undefined}
				classNames={{ root: "theme-picker-popover" }}
				styles={{
					container: {
						padding: 0,
						...(isDark
							? {
									backgroundColor: "#141414",
									border: "1px solid #262626",
									boxShadow:
										"0 6px 16px 0 rgba(0, 0, 0, 0.32), 0 3px 6px -4px rgba(0, 0, 0, 0.48)",
								}
							: undefined),
					},
					content: { padding: 0 },
				}}
				content={content}
			>
				<button
					type="button"
					className="theme-setting-control flex h-8 min-h-8 w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-0 text-left text-sm leading-none transition-colors hover:border-primary-300 dark:border-black-600 dark:bg-black-800 dark:hover:border-primary-700"
				>
					<span className="flex min-w-0 items-center gap-2">
						<ThemeSwatch shades={selectedShades} size="sm" />
						<span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
					</span>
					<KeyboardArrowDownOutlinedIcon
						sx={{ fontSize: 18 }}
						className="shrink-0 text-neutral-500 dark:text-neutral-400"
					/>
				</button>
			</Popover>
		</div>
	);
}
