import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { useAuth } from "../auth/AuthContext";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { Logo } from "../components/icons/logo";

function FloatingDocs() {
	return (
		<div className="relative mx-auto h-48 w-full max-w-sm sm:h-56">
			<div className="absolute left-0 top-3 w-[44%] -rotate-6 rounded-lg border border-white/10 bg-gradient-to-br from-blue-600/90 to-blue-900/90 p-3 shadow-xl shadow-black/40 backdrop-blur-sm">
				<DescriptionOutlinedIcon className="mb-2 text-blue-200/90" sx={{ fontSize: 22 }} />
				<p className="truncate text-xs font-medium text-white">Contract_v1.pdf</p>
				<p className="text-[10px] text-blue-200/70">2.4 MB</p>
			</div>
			<div className="absolute left-1/2 top-0 z-10 w-[48%] -translate-x-1/2 rotate-[2deg] rounded-lg border border-white/10 bg-gradient-to-br from-purple-600/85 to-indigo-950/90 p-3 shadow-2xl shadow-black/50">
				<DescriptionOutlinedIcon className="mb-2 text-purple-200/90" sx={{ fontSize: 24 }} />
				<p className="truncate text-xs font-medium text-white">Agreement_2025.docx</p>
				<p className="text-[10px] text-purple-200/70">Draft</p>
			</div>
			<div className="absolute right-0 top-5 w-[44%] rotate-6 rounded-lg border border-white/10 bg-gradient-to-br from-slate-700/95 to-slate-950/95 p-3 shadow-xl shadow-black/40">
				<DescriptionOutlinedIcon className="mb-2 text-slate-300/90" sx={{ fontSize: 22 }} />
				<p className="truncate text-xs font-medium text-white">Report_2025.pdf</p>
				<p className="text-[10px] text-slate-400">Final</p>
			</div>
		</div>
	);
}

function WorkflowCard() {
	return (
		<div className="mt-6 w-full max-w-xs rounded-xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-black/30 backdrop-blur-md">
			<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Workflow status</p>
			<ul className="space-y-2.5 text-sm">
				<li className="flex items-center gap-2 text-emerald-400">
					<CheckCircleIcon sx={{ fontSize: 18 }} />
					<span>Document upload</span>
				</li>
				<li className="flex items-center gap-2 text-blue-300">
					<PendingOutlinedIcon sx={{ fontSize: 18 }} className="animate-pulse" />
					<span>Document analysis</span>
				</li>
				<li className="flex items-center gap-2 text-slate-500">
					<RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />
					<span>Review</span>
				</li>
				<li className="flex items-center gap-2 text-slate-500">
					<RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />
					<span>Approval</span>
				</li>
			</ul>
		</div>
	);
}

export const Login = () => {
	const { isAuthResolved, isAuthenticated, login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const from =
		(location.state as { from?: { pathname?: string } } | null)?.from?.pathname?.trim() || "/";

	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [remember, setRemember] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!identifier.trim() || !password) {
			toast.error("Enter your username or email and password.");
			return;
		}
		setSubmitting(true);
		try {
			await login({ login: identifier.trim(), password });
			toast.success("Signed in");
			navigate(from, { replace: true });
		} catch (err) {
			toast.error(formatUserFacingError(err, "Could not sign in."));
		} finally {
			setSubmitting(false);
		}
	};

	if (!isAuthResolved) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#050810] text-slate-400">
				<p className="text-sm">Checking session…</p>
			</div>
		);
	}

	if (isAuthenticated) {
		return <Navigate to={from} replace />;
	}

	return (
		<div className="min-h-screen bg-[#050810] text-slate-100">
			<div className="grid min-h-screen lg:grid-cols-2">
				{/* Marketing panel */}
				<div className="relative hidden overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#050810] to-[#020617] px-10 py-14 lg:flex lg:flex-col lg:justify-between">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.25),transparent)]" />
					<div className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
					<div className="relative z-[1] flex flex-1 flex-col items-center justify-center">
						<FloatingDocs />
						<WorkflowCard />
					</div>
					<div className="relative z-[1] mt-10">
						<h1 className="max-w-lg text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
							Transform your contract management
						</h1>
						<p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400 xl:text-base">
							Streamline your CLM workflow with advanced solutions.
						</p>
						<div className="mt-10 flex flex-wrap gap-8 border-t border-white/10 pt-8">
							<div className="flex items-center gap-2 text-slate-300">
								<ShieldOutlinedIcon sx={{ fontSize: 22 }} className="text-blue-400/90" />
								<span className="text-sm font-medium">Secure</span>
							</div>
							<div className="flex items-center gap-2 text-slate-300">
								<BoltOutlinedIcon sx={{ fontSize: 22 }} className="text-amber-400/90" />
								<span className="text-sm font-medium">Fast</span>
							</div>
						</div>
					</div>
				</div>

				{/* Form panel */}
				<div className="flex flex-col justify-center bg-[#070b14] px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
					<div className="mx-auto w-full max-w-md">
						<div className="mb-10">
							<div className="block w-fit">
								<Logo size={100} primaryColor="#FFFFFF" secondaryColor="#CC5500" />
							</div>
							<h2 className="mt-8 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Welcome back</h2>
							<p className="mt-2 text-sm text-slate-400">Sign in to your account</p>
						</div>

						<form onSubmit={onSubmit} className="flex flex-col gap-5">
							<div>
								<label htmlFor="login-identifier" className="mb-2 block text-sm font-medium text-slate-200">
									Username or email
								</label>
								<div className="relative">
									<MailOutlineIcon
										className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
										sx={{ fontSize: 20 }}
									/>
									<input
										id="login-identifier"
										name="identifier"
										type="text"
										autoComplete="username"
										placeholder="Enter your username or email"
										value={identifier}
										onChange={(e) => setIdentifier(e.target.value)}
										className="w-full rounded-lg border border-slate-700/80 bg-slate-900/80 py-3 pl-11 pr-3 text-sm text-white placeholder:text-slate-500 outline-none ring-blue-500/40 transition-shadow focus:border-blue-500/60 focus:ring-2"
									/>
								</div>
							</div>

							<div>
								<label htmlFor="login-password" className="mb-2 block text-sm font-medium text-slate-200">
									Password
								</label>
								<div className="relative">
									<LockOutlinedIcon
										className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
										sx={{ fontSize: 20 }}
									/>
									<input
										id="login-password"
										name="password"
										type={showPassword ? "text" : "password"}
										autoComplete="current-password"
										placeholder="Enter your password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full rounded-lg border border-slate-700/80 bg-slate-900/80 py-3 pl-11 pr-11 text-sm text-white placeholder:text-slate-500 outline-none ring-blue-500/40 transition-shadow focus:border-blue-500/60 focus:ring-2"
									/>
									<button
										type="button"
										aria-label={showPassword ? "Hide password" : "Show password"}
										onClick={() => setShowPassword((v) => !v)}
										className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
									>
										{showPassword ? (
											<VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} />
										) : (
											<VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
										)}
									</button>
								</div>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3">
								<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
									<input
										type="checkbox"
										checked={remember}
										onChange={(e) => setRemember(e.target.checked)}
										className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/40"
									/>
									Remember me
								</label>
								<button
									type="button"
									className="text-sm font-medium text-blue-400 hover:text-blue-300"
									onClick={() => toast.info("Password reset is not available yet.")}
								>
									Forgot password?
								</button>
							</div>

							<button
								type="submit"
								disabled={submitting}
								className="mt-2 w-full rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 ring-1 ring-white/10 transition hover:from-slate-600 hover:to-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:pointer-events-none disabled:opacity-60"
							>
								{submitting ? "Signing in…" : "Sign in"}
							</button>
						</form>

						<p className="mt-10 text-center text-xs text-slate-500">
							<Link to="/" className="text-blue-400 hover:text-blue-300">
								Back to home
							</Link>
						</p>
					</div>
				</div>
			</div>

			{/* Mobile / narrow: condensed hero */}
			<div className="border-t border-white/5 bg-gradient-to-b from-[#0a1628] to-[#070b14] px-6 py-10 lg:hidden">
				<h1 className="text-xl font-bold text-white">Transform your contract management</h1>
				<p className="mt-2 text-sm text-slate-400">Streamline your CLM workflow with advanced solutions.</p>
				<div className="mt-6 flex gap-8">
					<div className="flex items-center gap-2 text-slate-300">
						<ShieldOutlinedIcon sx={{ fontSize: 20 }} className="text-blue-400/90" />
						<span className="text-sm font-medium">Secure</span>
					</div>
					<div className="flex items-center gap-2 text-slate-300">
						<BoltOutlinedIcon sx={{ fontSize: 20 }} className="text-amber-400/90" />
						<span className="text-sm font-medium">Fast</span>
					</div>
				</div>
			</div>
		</div>
	);
};
