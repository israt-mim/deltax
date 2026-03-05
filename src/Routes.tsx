
import { Route, Routes as ReactRoutes } from "react-router";
import { AppLayout } from "./layouts/AppLayout";
import { Home } from "./pages/Home";
import { Configure } from "./pages/Configure";

export const Routes = () => {
	return (
		<ReactRoutes>
			<Route element={<AppLayout />}>
				<Route index element={<Home />} />
				<Route path="/configure" element={<Configure />} />
			</Route>
		</ReactRoutes>
	)
}
