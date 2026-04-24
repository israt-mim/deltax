import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { useAuth } from "../auth/AuthContext";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { PageLoader } from "../components/base/PageLoader";
import { Logo } from "../components/icons/logo";

const MIN_PASSWORD_LEN = 8;

export const ForcePasswordChange = () => {
	const { isAuthResolved, user, changePassword } = useAuth();
	const navigate = useNavigate();

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showNew, setShowNew] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [newError, setNewError] = useState<string | undefined>();
	const [confirmError, setConfirmError] = useState<string | undefined>();
	const [submitting, setSubmitting] = useState(false);

	if (!isAuthResolved) {
		return <PageLoader variant="dark" />;
	}

	if (!user?.mustChangePassword) {
		return <Navigate to="/" replace />;
	}

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		let ok = true;
		if (newPassword.length < MIN_PASSWORD_LEN) {
			setNewError(`Use at least ${MIN_PASSWORD_LEN} characters`);
			ok = false;
		} else setNewError(undefined);
		if (newPassword !== confirmPassword) {
			setConfirmError("Passwords do not match");
			ok = false;
		} else setConfirmError(undefined);
		if (!ok) return;

		setSubmitting(true);
		try {
			await changePassword(newPassword, confirmPassword);
			toast.success("Password updated");
			navigate("/", { replace: true });
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not update password."));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#050810] text-slate-100">
			<div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
				<div className="mx-auto w-full max-w-md">
					<div className="mb-10">
						<div className="block w-fit">
							<Logo size={100} primaryColor="#FFFFFF" secondaryColor="#CC5500" />
						</div>
						<h1 className="mt-8 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
							Set a new password
						</h1>
						<p className="mt-2 text-sm text-slate-400">
							Your administrator requires you to choose a new password before continuing.
						</p>
					</div>

					<form onSubmit={onSubmit} className="flex flex-col gap-5">
						<div>
							<label htmlFor="force-new-password" className="mb-2 block text-sm font-medium text-slate-200">
								New password
							</label>
							<div className="relative">
								<LockOutlinedIcon
									className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
									sx={{ fontSize: 20 }}
								/>
								<input
									id="force-new-password"
									name="newPassword"
									type={showNew ? "text" : "password"}
									autoComplete="new-password"
									placeholder="Enter a new password"
									value={newPassword}
									onChange={(e) => {
										setNewPassword(e.target.value);
										if (newError) setNewError(undefined);
									}}
									className="w-full rounded-lg border border-slate-700/80 bg-slate-900/80 py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 outline-none ring-blue-500/40 transition-shadow focus:border-blue-500/60 focus:ring-2"
								/>
								<button
									type="button"
									aria-label={showNew ? "Hide password" : "Show password"}
									onClick={() => setShowNew((v) => !v)}
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
								>
									{showNew ? (
										<VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} />
									) : (
										<VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
									)}
								</button>
							</div>
							{newError ? <p className="mt-1.5 text-xs text-red-400">{newError}</p> : null}
						</div>

						<div>
							<label htmlFor="force-confirm-password" className="mb-2 block text-sm font-medium text-slate-200">
								Confirm new password
							</label>
							<div className="relative">
								<LockOutlinedIcon
									className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
									sx={{ fontSize: 20 }}
								/>
								<input
									id="force-confirm-password"
									name="confirmPassword"
									type={showConfirm ? "text" : "password"}
									autoComplete="new-password"
									placeholder="Confirm your new password"
									value={confirmPassword}
									onChange={(e) => {
										setConfirmPassword(e.target.value);
										if (confirmError) setConfirmError(undefined);
									}}
									className="w-full rounded-lg border border-slate-700/80 bg-slate-900/80 py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 outline-none ring-blue-500/40 transition-shadow focus:border-blue-500/60 focus:ring-2"
								/>
								<button
									type="button"
									aria-label={showConfirm ? "Hide password" : "Show password"}
									onClick={() => setShowConfirm((v) => !v)}
									className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
								>
									{showConfirm ? (
										<VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} />
									) : (
										<VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
									)}
								</button>
							</div>
							{confirmError ? <p className="mt-1.5 text-xs text-red-400">{confirmError}</p> : null}
						</div>

						<button
							type="submit"
							disabled={submitting}
							className="mt-2 w-full rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 ring-1 ring-white/10 transition hover:from-slate-600 hover:to-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:pointer-events-none disabled:opacity-60"
						>
							{submitting ? "Saving…" : "Continue"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};
