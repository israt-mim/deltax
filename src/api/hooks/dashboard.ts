import { useQuery } from "@tanstack/react-query";
import { listAgreementConfigs } from "../services/agreementConfigs";
import { listAgreements } from "../services/agreements";
import { listClauses } from "../services/clauses";
import {
	aggregateAgreementStatus,
	aggregateAgreementsByMonth,
	aggregateClauseActivity,
	aggregateTemplateActivation,
	aggregateTemplateCompletion,
	aggregateTopAgreementCategories,
} from "../../lib/dashboardAggregations";

const CHART_SAMPLE_LIMIT = 200;

export function useDashboardChartData() {
	return useQuery({
		queryKey: ["dashboard", "chart-samples", CHART_SAMPLE_LIMIT] as const,
		queryFn: async () => {
			const [agreementsRes, configsRes, clausesRes] = await Promise.all([
				listAgreements({ page: 1, limit: CHART_SAMPLE_LIMIT, sort: "-createdAt" }),
				listAgreementConfigs({ page: 1, limit: CHART_SAMPLE_LIMIT, sort: "-createdAt" }),
				listClauses({ page: 1, limit: CHART_SAMPLE_LIMIT, sort: "-createdAt" }),
			]);

			const agreements = agreementsRes.data;
			const configs = configsRes.data;
			const clauses = clausesRes.data;

			return {
				sampleLimit: CHART_SAMPLE_LIMIT,
				agreementsTotal: agreementsRes.pagination.total,
				configsTotal: configsRes.pagination.total,
				clausesTotal: clausesRes.pagination.total,
				agreementsSampled: agreements.length,
				configsSampled: configs.length,
				clausesSampled: clauses.length,
				agreementStatus: aggregateAgreementStatus(agreements),
				templateActivation: aggregateTemplateActivation(configs),
				templateCompletion: aggregateTemplateCompletion(configs),
				clauseActivity: aggregateClauseActivity(clauses),
				agreementsByMonth: aggregateAgreementsByMonth(agreements),
				topCategories: aggregateTopAgreementCategories(agreements),
			};
		},
		staleTime: 60_000,
	});
}
