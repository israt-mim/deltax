import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ApiError, useAgreementConfigQuery } from "../api";
import { formatUserFacingError } from "../lib/formatUserFacingError";
import { Card } from "../components/base/Card";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Typography } from "../components/base/Typography";

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1 border-b border-neutral-100 py-3 last:border-0 dark:border-black-600">
			<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
			<span className="text-sm text-neutral-900 dark:text-neutral-100">{value}</span>
		</div>
	);
}

const CreateAgreementConfiguration = () => {
	const { id } = useParams<{ id: string }>();
	const configQuery = useAgreementConfigQuery({ id });

	useEffect(() => {
		if (!configQuery.isError || !configQuery.error) return;
		const err = configQuery.error;
		const message =
			err instanceof ApiError && err.status === 404
				? "This agreement configuration could not be found."
				: formatUserFacingError(err, "Could not load agreement configuration.");
		toast.error(message, { toastId: `agreement-config-detail-${id ?? "unknown"}` });
	}, [configQuery.isError, configQuery.error, id]);

	if (!id?.trim()) {
		return (
			<CardMain className="flex flex-col gap-4">
				<Title>Create Agreement Configuration</Title>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">Missing configuration id.</p>
			</CardMain>
		);
	}

	return (
		<CardMain className="flex flex-col gap-4">
			<Title>Create Agreement Configuration</Title>

			{configQuery.isLoading && (
				<p className="text-sm text-neutral-500 dark:text-neutral-400">Loading configuration…</p>
			)}

			{configQuery.data && (
				<div className="flex flex-col gap-4">
					<Typography size="small" variant="regular" className="text-neutral-600 dark:text-neutral-400">
						Config ID: <span className="font-mono text-neutral-900 dark:text-neutral-100">{configQuery.data._id}</span>
					</Typography>
					<Card className="flex flex-col px-4 py-2">
						<DetailRow label="Category" value={configQuery.data.agreement_category?.name ?? "—"} />
						<DetailRow label="Domain" value={configQuery.data.agreement_domain?.name ?? "—"} />
						<DetailRow label="Agreement type" value={configQuery.data.agreement_type?.name ?? "—"} />
						<DetailRow label="Agreement subtype" value={configQuery.data.agreement_subtype?.name ?? "—"} />
						<div className="flex flex-col gap-1 py-3">
							<span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Steps</span>
							<ul className="list-inside list-disc text-sm text-neutral-900 dark:text-neutral-100">
								{configQuery.data.steps?.length
									? configQuery.data.steps.map((s) => <li key={s._id}>{s.name}</li>)
									: "—"}
							</ul>
						</div>
					</Card>
				</div>
			)}
		</CardMain>
	);
};

export default CreateAgreementConfiguration;
