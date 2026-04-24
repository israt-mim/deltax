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
	useDeleteUserMutation,
	useUpdateUserMutation,
	useUsersInfiniteList,
} from "./hooks/users";
