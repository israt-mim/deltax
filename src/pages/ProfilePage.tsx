import { useEffect, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import { useAuth } from "../auth/AuthContext";
import { useCurrentUserQuery, useUpdateProfileMutation } from "../api/hooks/users";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Button } from "../components/base/Button";
import { FormInput } from "../components/form-input/FormInput";
import { FormSelect } from "../components/form-input/FormSelect";
import { Switch } from "antd";
import { ChangePasswordForm } from "../components/profile/ChangePasswordForm";
import {
	ProfileSettingsNav,
	type ProfileSettingsSection,
} from "../components/profile/ProfileSettingsNav";
import { ProfileSettingsPanel } from "../components/profile/ProfileSettingsPanel";
import { usePageBreadcrumb } from "../hooks/usePageBreadcrumb";
import { useDarkMode } from "../hooks/useDarkMode";
import { crumb } from "../lib/breadcrumb";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { userInitials } from "../lib/userDisplay";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ReadOnlyField({ label, value }: { label: string; value: string }) {
	return (
		<FormInput label={label} value={value} disabled readOnly className="opacity-90" />
	);
}

export const ProfilePage = () => {
	const { user, refreshUser, changePassword } = useAuth();
	const profileQuery = useCurrentUserQuery(user?._id);
	const updateProfile = useUpdateProfileMutation();
	const { isDark, setIsDark } = useDarkMode();

	const [section, setSection] = useState<ProfileSettingsSection>("profile");
	const [passwordSubmitting, setPasswordSubmitting] = useState(false);

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [firstNameError, setFirstNameError] = useState<string | undefined>();
	const [lastNameError, setLastNameError] = useState<string | undefined>();
	const [emailError, setEmailError] = useState<string | undefined>();

	usePageBreadcrumb([crumb("Profile", "/profile")]);

	useEffect(() => {
		if (!user) return;
		setFirstName(user.firstName?.trim() ?? "");
		setLastName(user.lastName?.trim() ?? "");
		setEmail(user.email?.trim() ?? "");
	}, [user]);

	if (!user) return null;

	const profile = profileQuery.data;
	const initials = userInitials(user);

	const validateProfile = () => {
		const fn = firstName.trim();
		const ln = lastName.trim();
		const em = email.trim();
		let ok = true;

		if (!fn) {
			setFirstNameError("First name is required");
			ok = false;
		} else setFirstNameError(undefined);

		if (!ln) {
			setLastNameError("Last name is required");
			ok = false;
		} else setLastNameError(undefined);

		if (!em) {
			setEmailError("Email is required");
			ok = false;
		} else if (!EMAIL_RE.test(em)) {
			setEmailError("Enter a valid email address");
			ok = false;
		} else setEmailError(undefined);

		return ok ? { firstName: fn, lastName: ln, email: em } : null;
	};

	const onSaveProfile = async (e: FormEvent) => {
		e.preventDefault();
		const payload = validateProfile();
		if (!payload) return;

		try {
			await updateProfile.mutateAsync({ id: user._id, ...payload });
			await refreshUser();
			toast.success("Profile saved");
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not save profile."));
		}
	};

	const handlePasswordChange = async (_values: {
		currentPassword: string;
		newPassword: string;
		confirmNewPassword: string;
	}) => {
		setPasswordSubmitting(true);
		try {
			await changePassword(_values.newPassword, _values.confirmNewPassword);
			toast.success("Password updated");
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not update password."));
			throw err;
		} finally {
			setPasswordSubmitting(false);
		}
	};

	const profilePanel = (
		<ProfileSettingsPanel
			title="User Profile"
			subtitle="Manage your personal information, password, preference settings, etc."
			footer={
				<Button type="submit" form="profile-form" status="primary" loading={updateProfile.isPending}>
					Save
				</Button>
			}
		>
			<div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 dark:border-black-600 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-4">
					<span
						className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xl font-semibold text-neutral-600 dark:bg-black-700 dark:text-neutral-300"
						aria-hidden
					>
						{initials}
					</span>
					<p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Profile Picture</p>
				</div>
				<Button
					type="button"
					appearance="outlined"
					status="secondary-neutral"
					className="shrink-0"
					onClick={() => toast.info("Profile picture upload is not available yet.")}
				>
					<span className="flex items-center gap-2">
						<FileUploadOutlinedIcon sx={{ fontSize: 18 }} />
						Upload
					</span>
				</Button>
			</div>

			<form id="profile-form" onSubmit={onSaveProfile} className="flex flex-col gap-6">
				<div>
					<h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Personal Details</h3>
					<div className="mt-4 grid gap-4 lg:grid-cols-3">
						<FormInput
							label="First Name"
							required
							value={firstName}
							onChange={(e) => {
								setFirstName(e.target.value);
								setFirstNameError(undefined);
							}}
							error={firstNameError}
							autoComplete="given-name"
						/>
						<FormInput
							label="Last Name"
							required
							value={lastName}
							onChange={(e) => {
								setLastName(e.target.value);
								setLastNameError(undefined);
							}}
							error={lastNameError}
							autoComplete="family-name"
						/>
						<FormInput
							label="Email"
							required
							type="email"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								setEmailError(undefined);
							}}
							error={emailError}
							autoComplete="email"
						/>
					</div>
					<div className="mt-4 grid gap-4 lg:grid-cols-3">
						<ReadOnlyField
							label="User Group"
							value={profileQuery.isPending ? "…" : (profile?.groupName ?? "—")}
						/>
						<ReadOnlyField
							label="Teams"
							value={profileQuery.isPending ? "…" : (profile?.teamsSummary ?? "—")}
						/>
					</div>
				</div>
			</form>
		</ProfileSettingsPanel>
	);

	const generalPanel = (
		<ProfileSettingsPanel
			title="General"
			subtitle="Configure app-wide preferences like language, theme etc."
			footer={
				<Button type="button" status="primary" onClick={() => toast.success("Preferences saved")}>
					Save
				</Button>
			}
		>
			<div>
				<h3 className="text-sm font-semibold text-neutral-900 dark:text-white">App Theme Settings</h3>
				<div className="mt-4 grid gap-4 lg:grid-cols-2">
					<FormSelect
						label="Appearance"
						value={isDark ? "dark" : "light"}
						onChange={(value) => setIsDark(value === "dark")}
						options={[
							{ label: "Light", value: "light" },
							{ label: "Dark", value: "dark" },
						]}
					/>
					<div className="flex items-end gap-3 pb-1">
						<div className="flex flex-1 flex-col gap-1">
							<span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Dark Mode</span>
							<span className="text-xs text-neutral-500 dark:text-neutral-400">
								Toggle the application theme
							</span>
						</div>
						<Switch checked={isDark} onChange={setIsDark} />
					</div>
				</div>
			</div>
		</ProfileSettingsPanel>
	);

	const passwordPanel = (
		<ProfileSettingsPanel
			title="Password"
			subtitle="Update your password to keep your account secure."
		>
			<ChangePasswordForm
				key="password-panel"
				submitLabel="Apply"
				showCancel={false}
				loading={passwordSubmitting}
				onSubmit={handlePasswordChange}
			/>
		</ProfileSettingsPanel>
	);

	return (
		<CardMain className="flex w-full flex-col gap-5">
			<Title>Profile</Title>

			<div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start">
				<ProfileSettingsNav active={section} onChange={setSection} />
				<div className="min-w-0 flex-1">
					{section === "profile" && profilePanel}
					{section === "general" && generalPanel}
					{section === "password" && passwordPanel}
				</div>
			</div>
		</CardMain>
	);
};
