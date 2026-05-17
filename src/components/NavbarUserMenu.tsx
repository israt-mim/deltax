import { useMemo, useState, type ReactNode } from "react";
import { Dropdown, Switch } from "antd";
import { useNavigate } from "react-router";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import { useAuth } from "../auth/AuthContext";
import { APP_VERSION } from "../constants/app";
import { useDarkMode } from "../hooks/useDarkMode";
import { userDisplayName, userInitials, userShortName } from "../lib/userDisplay";

function UserAvatar({ initials, size = "md" }: { initials: string; size?: "md" | "lg" }) {
	const dim = size === "lg" ? "h-11 w-11 text-base" : "h-8 w-8 text-sm";
	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center rounded-full bg-success-100 font-semibold text-success-800 ${dim}`}
			aria-hidden
		>
			{initials}
		</span>
	);
}

type MenuRowProps = {
	icon: ReactNode;
	label: string;
	onClick?: () => void;
	labelClassName?: string;
	trailing?: ReactNode;
};

function MenuRow({ icon, label, onClick, labelClassName = "text-neutral-700", trailing }: MenuRowProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-black-700"
		>
			<span className="flex h-5 w-5 shrink-0 items-center justify-center text-neutral-500">{icon}</span>
			<span className={`min-w-0 flex-1 font-medium ${labelClassName}`}>{label}</span>
			{trailing}
		</button>
	);
}

function UserMenuPanel({
	onClose,
	onLogout,
}: {
	onClose: () => void;
	onLogout: () => void;
}) {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { isDark, toggle } = useDarkMode();

	if (!user) return null;

	const displayName = userDisplayName(user);
	const email = user.email?.trim() || user.username;
	const initials = userInitials(user);

	const go = (path: string) => {
		onClose();
		navigate(path);
	};

	return (
		<div className="w-[min(100vw-24px,300px)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:border-black-600 dark:bg-black-800">
			<div className="bg-primary-500 px-4 py-4">
				<div className="flex items-center gap-3">
					<UserAvatar initials={initials} size="lg" />
					<div className="min-w-0">
						<p className="truncate text-base font-semibold text-white">{displayName}</p>
						<p className="truncate text-sm text-white/75">{email}</p>
					</div>
				</div>
			</div>

			<div className="p-2">
				<MenuRow
					icon={<PersonOutlinedIcon sx={{ fontSize: 20, color: "#16a34a" }} />}
					label="Profile"
					labelClassName="text-success-700 dark:text-success-400"
					onClick={() => go("/settings")}
				/>
				<MenuRow
					icon={<SettingsOutlinedIcon sx={{ fontSize: 20 }} />}
					label="Settings"
					onClick={() => go("/settings")}
				/>
				<div className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm">
					<span className="flex h-5 w-5 shrink-0 items-center justify-center text-neutral-500">
						<DarkModeOutlinedIcon sx={{ fontSize: 20 }} />
					</span>
					<span className="min-w-0 flex-1 font-medium text-neutral-700 dark:text-neutral-300">Dark Mode</span>
					<Switch size="small" checked={isDark} onChange={toggle} />
				</div>
				<MenuRow
					icon={
						<span className="relative">
							<LocalOfferOutlinedIcon sx={{ fontSize: 20 }} />
							<span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-error-500" aria-hidden />
						</span>
					}
					label="Release Notes"
					onClick={onClose}
				/>
				<MenuRow
					icon={<LogoutOutlinedIcon sx={{ fontSize: 20, color: "#dc2626" }} />}
					label="Log out"
					labelClassName="text-error-600 dark:text-error-400"
					onClick={onLogout}
				/>
			</div>

			<div className="border-t border-primary-100 bg-primary-50 px-4 py-2.5 text-center dark:border-primary-900 dark:bg-primary-950">
				<span className="text-xs font-medium text-primary-600 dark:text-primary-300">{APP_VERSION}</span>
			</div>
		</div>
	);
}

export function NavbarUserMenu() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const [open, setOpen] = useState(false);

	const triggerLabel = useMemo(() => (user ? userShortName(user) : "Account"), [user]);
	const initials = useMemo(() => (user ? userInitials(user) : "?"), [user]);

	const handleLogout = () => {
		setOpen(false);
		void (async () => {
			await logout();
			navigate("/login", { replace: true });
		})();
	};

	if (!user) return null;

	return (
		<Dropdown
			open={open}
			onOpenChange={setOpen}
			trigger={["click"]}
			placement="bottomRight"
			popupRender={() => <UserMenuPanel onClose={() => setOpen(false)} onLogout={handleLogout} />}
		>
			<button
				type="button"
				className="flex max-w-[180px] items-center gap-2 rounded-lg bg-primary-400/60 px-2 py-1 text-white transition-colors hover:bg-primary-400"
				aria-label="Open account menu"
				aria-haspopup="menu"
			>
				<UserAvatar initials={initials} />
				<span className="truncate text-sm font-semibold">{triggerLabel}</span>
				<KeyboardArrowDownOutlinedIcon sx={{ fontSize: 18, color: "white", opacity: 0.9 }} />
			</button>
		</Dropdown>
	);
}
