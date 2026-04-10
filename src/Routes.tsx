
import { Route, Routes as ReactRoutes } from "react-router";
import { AppLayout } from "./layouts/AppLayout";
import { Home, Configure, Settings, AgreementConfiguration, FieldConfiguration } from "./pages/index";
import CreateFieldConfiguration from "./pages/CreateFieldConfiguration";

export const Routes = () => {
	return (
		<ReactRoutes>
			<Route element={<AppLayout />}>
				<Route index element={<Home />} />
				<Route path="/configure">
					<Route index element={<Configure />} />
					<Route path="fields" element={<FieldConfiguration />} />
					<Route path="fields/create" element={<CreateFieldConfiguration />} />
					<Route path="agreements" element={<AgreementConfiguration />} />
				</Route>
				<Route path="/settings" element={<Settings />} />
			</Route>
		</ReactRoutes>
	)
}
