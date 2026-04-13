import { useMemo, useState } from "react";
import { Modal } from "../../base/Modal";
import { FormInput } from "../../form-input/FormInput";
import { FormSelect } from "../../form-input/FormSelect";
import { FormMultiSelect } from "../../form-input/FormMultiSelect";
import { FormCheckbox } from "../../form-input/FormCheckbox";
import { Button } from "../../base/Button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UserModalVariant = "create" | "edit";

export interface IdLabelOption {
	label: string;
	value: string;
}

export interface NewUserPayload {
	firstName: string;
	lastName: string;
	email: string;
	group: string;
	teams: string[];
	/** JSON boolean sent as `mustChangePassword` on POST /api/users. */
	mustChangePassword: boolean;
}

export interface NewUserModalProps {
	open: boolean;
	variant?: UserModalVariant;
	/** Pre-fill when `variant` is `edit` (parent should bump `key` when opening). */
	initialValues?: {
		firstName: string;
		lastName: string;
		email: string;
		groupId: string;
		teamIds: string[];
		mustChangePassword: boolean;
	};
	onClose: () => void;
	onSubmit?: (payload: NewUserPayload) => void | Promise<void>;
	pending?: boolean;
	groupOptions: IdLabelOption[];
	teamOptions: IdLabelOption[];
	optionsLoading?: boolean;
}

export const NewUserModal = ({
	open,
	variant = "create",
	initialValues,
	onClose,
	onSubmit,
	pending,
	groupOptions,
	teamOptions,
	optionsLoading,
}: NewUserModalProps) => {
	const [firstName, setFirstName] = useState(
		() => (variant === "edit" && initialValues ? initialValues.firstName : "")
	);
	const [lastName, setLastName] = useState(
		() => (variant === "edit" && initialValues ? initialValues.lastName : "")
	);
	const [email, setEmail] = useState(() => (variant === "edit" && initialValues ? initialValues.email : ""));
	const [groupId, setGroupId] = useState<string | undefined>(() =>
		variant === "edit" && initialValues?.groupId ? initialValues.groupId : undefined
	);
	const [teamIds, setTeamIds] = useState<string[]>(
		() => (variant === "edit" && initialValues?.teamIds ? [...initialValues.teamIds] : [])
	);
	const [mustChangePassword, setMustChangePassword] = useState(
		() => (variant === "edit" && initialValues ? initialValues.mustChangePassword : true)
	);

	const [firstNameError, setFirstNameError] = useState<string | undefined>();
	const [lastNameError, setLastNameError] = useState<string | undefined>();
	const [emailError, setEmailError] = useState<string | undefined>();
	const [groupError, setGroupError] = useState<string | undefined>();
	const [teamsError, setTeamsError] = useState<string | undefined>();

	const formId = useMemo(() => (variant === "edit" ? "edit-user-form" : "new-user-form"), [variant]);
	const titleId = variant === "edit" ? "edit-user-title" : "new-user-title";
	const heading = variant === "edit" ? "Edit user" : "New user";
	const submitLabel = variant === "edit" ? "Save changes" : "Create user";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
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
		if (!groupId) {
			setGroupError("Group is required");
			ok = false;
		} else setGroupError(undefined);
		if (teamIds.length === 0) {
			setTeamsError("Select at least one team");
			ok = false;
		} else setTeamsError(undefined);

		if (!ok) return;
		if (!groupId) return;

		try {
			await onSubmit?.({
				firstName: fn,
				lastName: ln,
				email: em,
				group: groupId,
				teams: teamIds,
				mustChangePassword,
			});
			onClose();
		} catch {
			/* error surfaced by caller */
		}
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={560}
			header={
				<h2 id={titleId} className="mb-0 text-lg font-semibold text-neutral-900 dark:text-white">
					{heading}
				</h2>
			}
			footer={
				<div className="flex justify-end gap-3">
					<Button type="button" size="md" appearance="outlined" status="secondary-neutral" onClick={onClose}>
						Cancel
					</Button>
					<Button
						type="submit"
						form={formId}
						size="md"
						appearance="filled"
						status="primary"
						loading={pending}
						disabled={pending}
					>
						{submitLabel}
					</Button>
				</div>
			}
			aria-labelledby={titleId}
		>
			<form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormInput
						label="First name"
						required
						placeholder="First name"
						value={firstName}
						onChange={(e) => {
							setFirstName(e.target.value);
							if (firstNameError) setFirstNameError(undefined);
						}}
						error={firstNameError}
						autoComplete="given-name"
					/>
					<FormInput
						label="Last name"
						required
						placeholder="Last name"
						value={lastName}
						onChange={(e) => {
							setLastName(e.target.value);
							if (lastNameError) setLastNameError(undefined);
						}}
						error={lastNameError}
						autoComplete="family-name"
					/>
				</div>
				<FormInput
					label="Email"
					required
					type="email"
					placeholder="name@company.com"
					value={email}
					onChange={(e) => {
						setEmail(e.target.value);
						if (emailError) setEmailError(undefined);
					}}
					error={emailError}
					autoComplete="email"
				/>
				<FormSelect
					label="Group"
					required
					placeholder={optionsLoading ? "Loading groups…" : groupOptions.length ? "Select a group" : "No groups available"}
					showSearch
					optionFilterProp="label"
					options={groupOptions}
					value={groupId}
					onChange={(v) => {
						setGroupId(v ?? undefined);
						if (groupError) setGroupError(undefined);
					}}
					error={groupError}
					disabled={optionsLoading || groupOptions.length === 0}
					style={{ width: "100%" }}
				/>
				<FormMultiSelect
					label="Teams"
					required
					placeholder={optionsLoading ? "Loading teams…" : teamOptions.length ? "Select one or more teams" : "No teams available"}
					allowClear
					showSearch
					optionFilterProp="label"
					options={teamOptions}
					value={teamIds}
					onChange={(v) => {
						setTeamIds(v);
						if (teamsError) setTeamsError(undefined);
					}}
					error={teamsError}
					disabled={optionsLoading || teamOptions.length === 0}
					style={{ width: "100%" }}
				/>
				<FormCheckbox
					checked={mustChangePassword}
					onChange={(e) => setMustChangePassword(e.target.checked)}
					label="Ask user to change their password on next login"
				/>
			</form>
		</Modal>
	);
};
