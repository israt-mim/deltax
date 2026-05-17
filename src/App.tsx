import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { Slide, ToastContainer } from "react-toastify";
import { createAppQueryClient } from "./api/queryClient";
import { AuthProvider } from "./auth/AuthContext";
import { AppThemeProvider } from "./context/AppThemeContext";
import { Routes } from "./Routes";
import { fetchAgreementDetailsOnAppLoad } from "./store/agreementDetailsSlice";
import { useAppDispatch, useAppSelector } from "./store/hooks";

export const App = () => {
	const [queryClient] = useState(() => createAppQueryClient());
	const dispatch = useAppDispatch();
	const agreementDetailsStatus = useAppSelector((state) => state.agreementDetails.status);

	useEffect(() => {
		if (agreementDetailsStatus !== "idle") return;
		void dispatch(fetchAgreementDetailsOnAppLoad());
	}, [agreementDetailsStatus, dispatch]);

	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AppThemeProvider>
					<AuthProvider>
						<Routes />
					</AuthProvider>
				</AppThemeProvider>
			</BrowserRouter>
			<ToastContainer
				position="bottom-right"
				transition={Slide}
				autoClose={2000}
				newestOnTop
				closeOnClick
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="colored"
				limit={4}
				style={{ zIndex: 2147483647 }}
			/>
		</QueryClientProvider>
	);
};
