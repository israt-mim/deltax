import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { authLogin, authLogout, fetchAuthMe, type AuthUser } from "../api/services/auth";

export type { AuthUser };

export type AuthContextValue = {
	/** `false` until the initial `GET /api/auth/me` completes. */
	isAuthResolved: boolean;
	isAuthenticated: boolean;
	user: AuthUser | null;
	login: (credentials: { login: string; password: string }) => Promise<void>;
	logout: () => Promise<void>;
	/** Re-fetch session from the server (e.g. after profile updates). */
	refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [isAuthResolved, setAuthResolved] = useState(false);
	const [user, setUser] = useState<AuthUser | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const u = await fetchAuthMe();
			if (!cancelled) {
				setUser(u);
				setAuthResolved(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const login = useCallback(async (credentials: { login: string; password: string }) => {
		const u = await authLogin(credentials);
		setUser(u);
	}, []);

	const logout = useCallback(async () => {
		try {
			await authLogout();
		} catch {
			/* still clear client; cookie may already be invalid */
		}
		setUser(null);
	}, []);

	const refreshUser = useCallback(async () => {
		const u = await fetchAuthMe();
		setUser(u);
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			isAuthResolved,
			isAuthenticated: user !== null,
			user,
			login,
			logout,
			refreshUser,
		}),
		[isAuthResolved, user, login, logout, refreshUser]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}

function AuthLoadingScreen() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-600 dark:bg-black-900 dark:text-neutral-300">
			<p className="text-sm">Loading…</p>
		</div>
	);
}

/** Wrap routes that require a session; unauthenticated users go to `/login`. */
export function RequireAuth() {
	const { isAuthResolved, isAuthenticated } = useAuth();
	const location = useLocation();

	if (!isAuthResolved) return <AuthLoadingScreen />;
	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <Outlet />;
}
