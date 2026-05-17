import { useState, type FormEvent } from "react";
import { FormPassword } from "../form-input/FormPassword";
import { Button } from "../base/Button";
import { PasswordRequirements } from "./PasswordRequirements";
import { isPasswordValid } from "../../lib/passwordValidation";

export type ChangePasswordFormProps = {
	onSubmit: (values: {
		currentPassword: string;
		newPassword: string;
		confirmNewPassword: string;
	}) => Promise<void>;
	onCancel?: () => void;
	submitLabel?: string;
	showCancel?: boolean;
	loading?: boolean;
};

export function ChangePasswordForm({
	onSubmit,
	onCancel,
	submitLabel = "Apply",
	showCancel = true,
	loading = false,
}: ChangePasswordFormProps) {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmNewPassword, setConfirmNewPassword] = useState("");
	const [currentPasswordError, setCurrentPasswordError] = useState<string | undefined>();
	const [newPasswordError, setNewPasswordError] = useState<string | undefined>();
	const [confirmNewPasswordError, setConfirmNewPasswordError] = useState<string | undefined>();

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		let ok = true;

		if (!currentPassword.trim()) {
			setCurrentPasswordError("Current password is required");
			ok = false;
		} else setCurrentPasswordError(undefined);

		if (!isPasswordValid(newPassword)) {
			setNewPasswordError("Password does not meet the requirements below");
			ok = false;
		} else setNewPasswordError(undefined);

		if (newPassword !== confirmNewPassword) {
			setConfirmNewPasswordError("Passwords do not match");
			ok = false;
		} else setConfirmNewPasswordError(undefined);

		if (!ok) return;

		await onSubmit({
			currentPassword: currentPassword.trim(),
			newPassword,
			confirmNewPassword,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<FormPassword
				label="Current Password"
				required
				value={currentPassword}
				onChange={(e) => {
					setCurrentPassword(e.target.value);
					setCurrentPasswordError(undefined);
				}}
				error={currentPasswordError}
				autoComplete="current-password"
			/>
			<FormPassword
				label="New Password"
				required
				value={newPassword}
				onChange={(e) => {
					setNewPassword(e.target.value);
					setNewPasswordError(undefined);
				}}
				error={newPasswordError}
				autoComplete="new-password"
			/>
			<PasswordRequirements password={newPassword} />
			<FormPassword
				label="Confirm New Password"
				required
				value={confirmNewPassword}
				onChange={(e) => {
					setConfirmNewPassword(e.target.value);
					setConfirmNewPasswordError(undefined);
				}}
				error={confirmNewPasswordError}
				autoComplete="new-password"
			/>
			<div className="flex justify-end gap-3 pt-1">
				{showCancel && onCancel ? (
					<Button type="button" appearance="outlined" status="secondary-neutral" onClick={onCancel}>
						Cancel
					</Button>
				) : null}
				<Button type="submit" status="primary" loading={loading}>
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}
