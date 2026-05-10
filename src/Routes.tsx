import { Route, Routes as ReactRoutes } from "react-router";
import { RequireAuth, RequirePasswordResetComplete } from "./auth/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { Home, Configure, Settings, AgreementConfiguration, FieldConfiguration } from "./pages/index";
import CreateFieldConfiguration from "./pages/CreateFieldConfiguration";
import CreateAgreementConfiguration from "./pages/CreateAgreementConfiguration";
import CreateAgreementDetailsPage from "./pages/CreateAgreementDetailsPage";
import { AgreementConfigurationDetailsPage } from "./pages/AgreementConfigurationDetailsPage";
import { FieldDetailPage } from "./pages/FieldDetailPage";
import { ClausesPage } from "./pages/ClausesPage";
import { ClauseDetailPage } from "./pages/ClauseDetailPage";
import { Login } from "./pages/Login";
import { ForcePasswordChange } from "./pages/ForcePasswordChange";
import { AgreementListPage } from "./pages/AgreementListPage";

export const Routes = () => {
	return (
		<ReactRoutes>
			<Route path="/login" element={<Login />} />
			<Route element={<RequireAuth />}>
				<Route path="change-password" element={<ForcePasswordChange />} />
				<Route element={<AppLayout />}>
					<Route element={<RequirePasswordResetComplete />}>
						<Route index element={<Home />} />
						<Route path="/agreements/create/:id" element={<CreateAgreementDetailsPage />} />
						<Route path="/agreements/:categoryId/:domainId" element={<AgreementListPage />} />
						<Route path="/agreements" element={<AgreementListPage />} />
						<Route path="/configure">
							<Route index element={<Configure />} />
							<Route path="fields" element={<FieldConfiguration />} />
							<Route path="fields/create" element={<CreateFieldConfiguration />} />
							<Route path="fields/:id" element={<FieldDetailPage />} />
							<Route path="agreements/configuration" element={<AgreementConfiguration />} />
							<Route path="agreements/create/:id" element={<CreateAgreementConfiguration />} />
							<Route path="agreements/:id" element={<AgreementConfigurationDetailsPage />} />
							<Route path="agreements" element={<AgreementConfiguration />} />
						</Route>
						<Route path="/clauses" element={<ClausesPage />} />
						<Route path="/clauses/:id" element={<ClauseDetailPage />} />
						<Route path="/settings" element={<Settings />} />
					</Route>
				</Route>
			</Route>
		</ReactRoutes>
	);
};
