import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { Slide, ToastContainer } from "react-toastify";
import { createAppQueryClient } from "./api/queryClient";
import { AuthProvider } from "./auth/AuthContext";
import { Routes } from "./Routes";

export const App = () => {
	const [queryClient] = useState(() => createAppQueryClient());

	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AuthProvider>
					<Routes />
				</AuthProvider>
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
