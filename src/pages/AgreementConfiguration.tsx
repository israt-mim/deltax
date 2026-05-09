import { useNavigate } from "react-router-dom";
import { Button } from "../components/base/Button";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Typography } from "../components/base/Typography";

/** Configure hub entry — agreements catalog lives on {@link AgreementListPage}. */
export function AgreementConfiguration() {
	const navigate = useNavigate();

	return (
		<CardMain className="flex max-w-2xl flex-col gap-6">
			<div>
				<Title>Agreement configuration</Title>
				<Typography appearance="body" size="small" className="mt-2">
					Open the agreements list to browse and manage configurations by catalog scope.
				</Typography>
			</div>
			<div>
				<Button size="md" status="primary" onClick={() => void navigate("/configure/agreements")}>
					Open agreements list
				</Button>
			</div>
		</CardMain>
	);
}
