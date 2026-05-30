import { useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "react-toastify";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import { authForgotPassword } from "../api/services/auth";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Logo } from "../components/icons/logo";

const RESEND_COOLDOWN_SECONDS = 60;

export const ForgotPasswordPage = () => {
	const [email, setEmail] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [sent, setSent] = useState(false);
	const [cooldown, setCooldown] = useState(0);

	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [cooldown]);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) {
			toast.error("Enter your email address.");
			return;
		}
		setSubmitting(true);
		try {
			await authForgotPassword({ email: trimmed });
			setSent(true);
			setCooldown(RESEND_COOLDOWN_SECONDS);
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not send reset email."));
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
							Forgot your password?
						</h1>
						<p className="mt-2 text-sm text-slate-400">
							Enter your account email and we'll send you a link to reset your password.
						</p>
					</div>

					{sent ? (
						<div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-6">
							<div className="mb-4 flex items-center gap-3">
								<CheckCircleOutlinedIcon sx={{ fontSize: 28 }} className="shrink-0 text-emerald-400" />
								<p className="text-base font-semibold text-white">Check your email</p>
							</div>
							<p className="text-sm text-slate-400">
								If <span className="font-medium text-slate-200">{email}</span> is registered, you'll
								receive a reset link shortly. Check your inbox and spam folder.
							</p>
							<p className="mt-3 text-xs text-slate-500">The link expires in 10 minutes.</p>

							<div className="mt-5 border-t border-white/10 pt-5">
								<p className="mb-3 text-xs text-slate-500">Didn't get the email?</p>
								<button
									type="button"
									disabled={cooldown > 0 || submitting}
									onClick={onSubmit as unknown as React.MouseEventHandler}
									className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
								>
									{cooldown > 0 ? `Resend in ${cooldown}s` : submitting ? "Sending…" : "Resend link"}
								</button>
							</div>

							<Link
								to="/login"
								className="mt-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
							>
								<ArrowBackOutlinedIcon sx={{ fontSize: 16 }} />
								Back to sign in
							</Link>
						</div>
					) : (
						<form onSubmit={onSubmit} className="flex flex-col gap-5">
							<div>
								<label
									htmlFor="forgot-email"
									className="mb-2 block text-sm font-medium text-slate-200"
								>
									Email address
								</label>
								<div className="relative">
									<MailOutlineIcon
										className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
										sx={{ fontSize: 20 }}
									/>
									<input
										id="forgot-email"
										name="email"
										type="email"
										autoComplete="email"
										autoFocus
										placeholder="Enter your email address"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="w-full rounded-lg border border-slate-700/80 bg-slate-900/80 py-3 pl-11 pr-3 text-sm text-white placeholder:text-slate-500 outline-none ring-blue-500/40 transition-shadow focus:border-blue-500/60 focus:ring-2"
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={submitting}
								className="mt-2 w-full rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 ring-1 ring-white/10 transition hover:from-slate-600 hover:to-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:pointer-events-none disabled:opacity-60"
							>
								{submitting ? "Sending…" : "Send reset link"}
							</button>

							<Link
								to="/login"
								className="flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
							>
								<ArrowBackOutlinedIcon sx={{ fontSize: 16 }} />
								Back to sign in
							</Link>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};
