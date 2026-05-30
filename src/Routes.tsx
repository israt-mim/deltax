import { Route, Routes as ReactRoutes } from "react-router";
import { RequireAuth, RequireAdmin, RequirePasswordResetComplete } from "./auth/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { Home, Configure, Settings, ProfilePage, AgreementConfiguration, FieldConfiguration } from "./pages/index";
import CreateFieldConfiguration from "./pages/CreateFieldConfiguration";
import CreateAgreementConfiguration from "./pages/CreateAgreementConfiguration";
import CreateAgreementDetailsPage from "./pages/CreateAgreementDetailsPage";
import AgreementDetailsPage from "./pages/AgreementDetailsPage";
import { AgreementConfigurationDetailsPage } from "./pages/AgreementConfigurationDetailsPage";
import { FieldDetailPage } from "./pages/FieldDetailPage";
import { ClausesPage } from "./pages/ClausesPage";
import { ClauseDetailPage } from "./pages/ClauseDetailPage";
import { Login } from "./pages/Login";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ForcePasswordChange } from "./pages/ForcePasswordChange";
import { AgreementListPage } from "./pages/AgreementListPage";
import { DocEditorPage } from "./pages/DocEditorPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { TemplateEditorPage } from "./pages/TemplateEditorPage";

export const Routes = () => {
	return (
		<ReactRoutes>
			<Route path="/login" element={<Login />} />
			<Route path="/forgot-password" element={<ForgotPasswordPage />} />
			<Route path="/reset-password" element={<ResetPasswordPage />} />
			<Route element={<RequireAuth />}>
				<Route path="change-password" element={<ForcePasswordChange />} />
				<Route element={<AppLayout />}>
					<Route element={<RequirePasswordResetComplete />}>
						<Route index element={<Home />} />
						<Route path="/agreements/create/:id" element={<CreateAgreementDetailsPage />} />
						<Route path="/agreements/:categoryId/:domainId" element={<AgreementListPage />} />
						<Route path="/agreements/:id" element={<AgreementDetailsPage />} />
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
							<Route path="templates" element={<TemplatesPage />} />
							<Route path="templates/:id/edit" element={<TemplateEditorPage />} />
						</Route>
						<Route path="/clauses" element={<ClausesPage />} />
						<Route path="/clauses/:id" element={<ClauseDetailPage />} />
						<Route path="/profile" element={<ProfilePage />} />
						<Route element={<RequireAdmin />}>
							<Route path="/settings" element={<Settings />} />
						</Route>
						<Route path="/editor" element={<DocEditorPage />} />
					</Route>
				</Route>
			</Route>
		</ReactRoutes>
	);
};
