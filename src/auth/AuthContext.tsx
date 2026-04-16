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
import { BrandPageLoader } from "../components/base/BrandPageLoader";
import { NAVBAR_HEIGHT } from "../constants/global";
import {
	authChangePassword,
	authLogin,
	authLogout,
	fetchAuthMe,
	type AuthUser,
} from "../api/services/auth";

export type { AuthUser };

export type AuthContextValue = {
	/** `false` until the initial `GET /api/auth/me` completes. */
	isAuthResolved: boolean;
	isAuthenticated: boolean;
	user: AuthUser | null;
	login: (credentials: { login: string; password: string }) => Promise<AuthUser>;
	logout: () => Promise<void>;
	/** Re-fetch session from the server (e.g. after profile updates). */
	refreshUser: () => Promise<void>;
	/** After forced password change; updates session user from API response. */
	changePassword: (newPassword: string, confirmNewPassword: string) => Promise<void>;
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
		return u;
	}, []);

	const changePassword = useCallback(async (newPassword: string, confirmNewPassword: string) => {
		const u = await authChangePassword({
			newPassword,
			confirmNewPassword,
			mustChangePassword: false,
		});
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
			changePassword,
		}),
		[isAuthResolved, user, login, logout, refreshUser, changePassword]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}

/** Wrap routes that require a session; unauthenticated users go to `/login`. */
export function RequireAuth() {
	const { isAuthResolved, isAuthenticated } = useAuth();
	const location = useLocation();

	if (!isAuthResolved) {
		return (
			<div
				className="flex w-full items-center justify-center bg-neutral-50 dark:bg-black-900"
				style={{ minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}
			>
				<BrandPageLoader variant="light" mode="embedded" />
			</div>
		);
	}
	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <Outlet />;
}

/** Blocks app shell routes until `mustChangePassword` is cleared (redirects to `/change-password`). */
export function RequirePasswordResetComplete() {
	const { user } = useAuth();
	const location = useLocation();

	if (user?.mustChangePassword === true) {
		return <Navigate to="/change-password" replace state={{ from: location }} />;
	}

	return <Outlet />;
}
