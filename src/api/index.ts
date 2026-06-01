export { authChangePassword, authLogin, authLogout, fetchAuthUser } from "./services/auth";
export type { AuthChangePasswordBody, AuthUser } from "./services/auth";

export { ApiError, get, post, patch, put, del, request } from "./client/http";
export type { HttpMethod, RequestOptions } from "./client/http";
export { getApiBaseUrl, buildApiUrl } from "./client/config";
export { createAppQueryClient } from "./queryClient";
export { queryKeys } from "./queryKeys";

export { buildQueryString } from "./client/queryString";
export type { ListPagination, ListResponse, BaseListQuery } from "./types/list";
export type { BulkDeleteResult, BulkDeleteSkippedItem } from "./types/bulkDelete";

export {
	bulkDeleteTeams,
	createTeam,
	deleteTeam,
	mapTeamFromApi,
	listTeams,
	updateTeam,
} from "./services/teams";
export type { CreateTeamBody, TeamApiDocument, ListTeamsParams, UpdateTeamBody } from "./services/teams";

export {
	bulkDeleteGroups,
	createGroup,
	deleteGroup,
	mapGroupFromApi,
	listGroups,
	updateGroup,
} from "./services/groups";
export type { CreateGroupBody, GroupApiDocument, ListGroupsParams, UpdateGroupBody } from "./services/groups";

export {
	bulkDeleteUsers,
	createUser,
	deleteUser,
	getUserById,
	listUsers,
	mapUserListItem,
	updateUser,
} from "./services/users";
export type {
	CreateUserBody,
	CreateUserResponse,
	CreatedUserApi,
	ListUsersParams,
	UpdateUserBody,
	UserApiListItem,
	UserGroupPopulated,
	UserTeamPopulated,
} from "./services/users";

export {
	useBulkDeleteTeamsMutation,
	useCreateTeamMutation,
	useDeleteTeamMutation,
	useTeamsInfiniteList,
	useUpdateTeamMutation,
} from "./hooks/teams";
export {
	useBulkDeleteGroupsMutation,
	useCreateGroupMutation,
	useDeleteGroupMutation,
	useGroupsInfiniteList,
	useUpdateGroupMutation,
} from "./hooks/groups";
export {
	useBulkDeleteUsersMutation,
	useCreateUserMutation,
	useCurrentUserQuery,
	useDeleteUserMutation,
	useDeleteUserAvatarMutation,
	useUpdateProfileMutation,
	useUpdateUserMutation,
	useUploadUserAvatarMutation,
	useUsersInfiniteList,
} from "./hooks/users";
export type { UpdateProfileBody } from "./hooks/users";

export {
	bulkDeleteFields,
	buildFieldConfigurationCreateBody,
	createField,
	deleteField,
	fieldDocToRow,
	getFieldById,
	getFieldContextOptions,
	getFieldGroups,
	listFields,
	updateField,
} from "./services/fields";
export type {
	CreateFieldBody,
	FieldConfigurationApiDocument,
	FieldContextOption,
	FieldGroupApiItem,
	FieldDetails,
	FieldTypePayload,
	ListFieldsParams,
	UpdateFieldBody,
} from "./services/fields";
export { FIELD_TYPES, DATA_TYPES } from "./services/fields";
export type { FieldDataTypeValue, FieldTypeValue } from "./services/fields";

export {
	useBulkDeleteFieldsMutation,
	useCreateFieldMutation,
	useDeleteFieldMutation,
	useFieldContextOptionsQuery,
	useFieldGroupsQuery,
	useFieldsInfiniteList,
	useFieldsTotalCount,
	useUpdateFieldMutation,
} from "./hooks/fields";

export {
	listAgreementCategories,
	listAgreementDomains,
	listAgreementSteps,
	listAgreementSubtypes,
	listAgreementTypes,
	isMongoObjectIdString,
} from "./services/agreementCatalog";
export type {
	AgreementCategoryApi,
	AgreementDomainApi,
	AgreementStepApi,
	AgreementSubtypeApi,
	AgreementTypeApi,
	ListAgreementCategoriesParams,
	ListAgreementDomainsParams,
	ListAgreementStepsParams,
	ListAgreementSubtypesParams,
	ListAgreementTypesParams,
} from "./services/agreementCatalog";

export {
	useAgreementCategoriesQuery,
	useAgreementDomainsQuery,
	useAgreementStepsQuery,
	useAgreementSubtypesQuery,
	useAgreementTypesQuery,
} from "./hooks/agreementCatalog";

export {
	buildAgreementRelevantTeamsPayload,
	bulkDeleteAgreementConfigs,
	configureAgreementConfig,
	createAgreementConfig,
	deleteAgreementConfig,
	getAgreementConfigById,
	listAgreementConfigs,
	patchAgreementConfigActivation,
	patchAgreementConfigCatalog,
	resolveAgreementRelevantTeamId,
} from "./services/agreementConfigs";
export type {
	AgreementCatalogFieldInput,
	AgreementCatalogUpdateBody,
	AgreementConfigApi,
	AgreementRelevantTeamEntry,
	AgreementRelevantTeamRef,
	AgreementConfigListConfiguredSection,
	AgreementConfigListConfiguredStep,
	AgreementConfigListItem,
	AgreementConfigsListParams,
	AgreementConfiguredSection,
	AgreementConfiguredStep,
	AgreementConfigureRequestBody,
	AgreementConfigureSectionRequest,
	AgreementConfigureStepRequest,
	CreateAgreementConfigBody,
	BulkDeleteAgreementConfigsResponse,
	DeleteAgreementConfigResponse,
} from "./services/agreementConfigs";

export {
	useAgreementConfigQuery,
	useAgreementConfigsInfiniteList,
	useAgreementConfigsTotalCount,
	useBulkDeleteAgreementConfigsMutation,
	useConfigureAgreementConfigMutation,
	useCreateAgreementConfigMutation,
	useDeleteAgreementConfigMutation,
	usePatchAgreementConfigActivationMutation,
	usePatchAgreementConfigCatalogMutation,
} from "./hooks/agreementConfigs";
export type { AgreementConfigsListFilters } from "./hooks/agreementConfigs";

export { getClauseById, listClauses } from "./services/clauses";
export type {
	ClauseDetailApi,
	ClauseDetailSection,
	ClauseListItem,
	ClauseSectionFields,
	ClauseSectionName,
	ClausesListParams,
} from "./services/clauses";

export { useClauseDetailQuery, useClausesInfiniteList, useClausesTotalCount } from "./hooks/clauses";
export { useDashboardChartData } from "./hooks/dashboard";
export type { ClausesListFilters } from "./hooks/clauses";

export { getAgreementDetails } from "./services/agreementDetails";
export type {
	AgreementDetailsCategoryApi,
	AgreementDetailsDomainApi,
	AgreementDetailsResponse,
	AgreementDetailsStepApi,
	AgreementDetailsSubtypeApi,
	AgreementDetailsTypeApi,
	GetAgreementDetailsParams,
} from "./services/agreementDetails";

export {
	agreementStepDetailsOfQuery,
	agreementStepEditorHideWizardNav,
	agreementTabKeyFromStep,
	buildAgreementTabDescriptors,
	buildAgreementFieldValuesPatchList,
	resolveAgreementTabKeyFromUrl,
	fieldValuesPatchOfParam,
	bulkDeleteAgreements,
	createAgreement,
	deleteAgreementLineItem,
	getAgreementDashboard,
	getAgreementStepDetails,
	getAgreementSteps,
	getAgreementTeams,
	getAgreementAttachments,
	createAgreementAttachmentFolder,
	uploadAgreementAttachment,
	uploadAgreementAttachments,
	updateAgreementAttachment,
	deleteAgreementAttachment,
	getAgreementWizardDetails,
	isAgreementFieldValuesStep,
	isAuthoringOrModificationAgreementCreationStep,
	isClausesAgreementStep,
	isClausesWizardStepName,
	isHeaderAgreementStep,
	isLineItemsAgreementStep,
	isLineItemsWizardStepName,
	fetchAllAgreementClauseIds,
	listAgreementClauses,
	listAgreements,
	normalizeAgreementStepDetailsData,
	patchAgreementClauses,
	patchAgreementFieldValues,
	patchAgreementLineItem,
	patchAgreementTeamMembers,
	postAgreementLineItem,
} from "./services/agreements";
export type {
	AgreementClauseBrief,
	AgreementClauseRefEntry,
	AgreementDashboardCatalogRef,
	AgreementDashboardData,
	AgreementDashboardEnvelope,
	AgreementDashboardUser,
	AgreementDocumentStep,
	AgreementTeamEntry,
	AgreementTeamMember,
	AgreementTeamRef,
	AgreementTeamsData,
	AgreementTeamsEnvelope,
	AgreementTeamUser,
	AgreementAttachment,
	AgreementAttachmentUser,
	AgreementAttachmentsData,
	AgreementLineItemsLayoutBlock,
	AgreementLineItemsTableBlock,
	AgreementLineItemsTableColumn,
	AgreementLineItemsTableRow,
	AgreementListItem,
	AgreementListUser,
	AgreementClausesListParams,
	AgreementsListParams,
	AgreementStepDetailsData,
	AgreementStepDetailsField,
	AgreementStepDetailsMeta,
	AgreementStepDetailsSection,
	AgreementTabDescriptor,
	AgreementWizardFullData,
	AgreementWizardStepBlock,
	BulkDeleteAgreementsResponse,
	CreateAgreementBody,
	CreateAgreementResponse,
	DeleteAgreementLineItemResponse,
	GetAgreementStepDetailsOptions,
	GetAgreementStepsResponse,
	PatchAgreementClausesBody,
	PatchAgreementClausesResponse,
	PatchAgreementFieldValueItem,
	PatchAgreementFieldValuesBody,
	PatchAgreementFieldValuesResponse,
	PatchAgreementLineItemBody,
	PatchAgreementLineItemResponse,
	PatchAgreementTeamMembersBody,
	PatchAgreementTeamMembersResponse,
	PostAgreementLineItemBody,
	PostAgreementLineItemResponse,
} from "./services/agreements";
export {
	agreementStepDetailsQueryKey,
	formatAgreementStepDetailsQueryError,
	invalidateAgreementStepDetailsQueries,
	normalizeAgreementLineItemIdForQuery,
	useAgreementDashboardQuery,
	useAgreementDocumentStepsQuery,
	useAgreementStepDetailsQuery,
	useAgreementTeamsQuery,
	useAgreementAttachmentsQuery,
	useAgreementClausesInfiniteList,
	useAgreementAttachedClauseIdsQuery,
	useCreateAgreementAttachmentFolderMutation,
	useUploadAgreementAttachmentMutation,
	useDeleteAgreementAttachmentMutation,
	useAgreementsInfiniteList,
	useAgreementsTotalCount,
	useBulkDeleteAgreementsMutation,
	useCreateAgreementMutation,
	useDeleteAgreementLineItemMutation,
	useDeleteAgreementMutation,
	usePatchAgreementClausesMutation,
	usePatchAgreementFieldValuesMutation,
	usePatchAgreementLineItemMutation,
	usePatchAgreementTeamMembersMutation,
	usePostAgreementLineItemMutation,
} from "./hooks/agreements";
export type { AgreementsListFilters } from "./hooks/agreements";

export {
	createTemplate,
	deleteTemplate,
	getTemplateById,
	listTemplates,
	templateDocToRow,
	updateTemplate,
} from "./services/templates";
export type {
	CreateTemplateBody,
	ListTemplatesParams,
	TemplateCatalogRef,
	TemplateListItem,
	TemplateRow,
	UpdateTemplateBody,
} from "./services/templates";
export {
	useCreateTemplateMutation,
	useDeleteTemplateMutation,
	useTemplateDetailQuery,
	useTemplatesInfiniteList,
	useTemplatesTotalCount,
	useUpdateTemplateMutation,
} from "./hooks/templates";
export type { TemplatesListFilters } from "./hooks/templates";
