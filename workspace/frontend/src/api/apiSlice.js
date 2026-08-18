import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "../features/auth/authSlice";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(logout());
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Company",
    "Workspace",
    "Member",
    "Group",
    "GroupMessage",
    "Project",
    "Task",
    "Document",
    "Comment",
    "Attendance",
    "Leave",
    "Standup",
    "Notice",
    "Notification",
    "Nda",
    "ProjectMessage",
    "Submission",
  ],
  endpoints: (builder) => ({
    // ---------- auth ----------
    login: builder.mutation({
      query: (credentials) => ({ url: "/auth/login", method: "POST", body: credentials }),
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({ url: "/auth/forgot-password", method: "POST", body: { email } }),
    }),
    getMe: builder.query({
      query: () => "/auth/me",
    }),
    updateMe: builder.mutation({
      query: (body) => ({ url: "/users/me", method: "PATCH", body }),
    }),

    // ---------- companies ----------
    getCompanies: builder.query({
      query: (params) => ({ url: "/companies", params }),
      providesTags: (result) =>
        result
          ? [...result.data.map((c) => ({ type: "Company", id: c.id })), { type: "Company", id: "LIST" }]
          : [{ type: "Company", id: "LIST" }],
    }),
    createCompany: builder.mutation({
      query: (body) => ({ url: "/companies", method: "POST", body }),
      invalidatesTags: [{ type: "Company", id: "LIST" }],
    }),
    deleteCompany: builder.mutation({
      query: (companyId) => ({ url: `/companies/${companyId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Company", id: "LIST" }],
    }),

    // ---------- workspaces (batches) ----------
    getCompanyWorkspaces: builder.query({
      query: ({ companyId, ...params }) => ({ url: `/companies/${companyId}/workspaces`, params }),
      providesTags: (result) =>
        result
          ? [...result.data.map((w) => ({ type: "Workspace", id: w.id })), { type: "Workspace", id: "LIST" }]
          : [{ type: "Workspace", id: "LIST" }],
    }),
    createWorkspace: builder.mutation({
      query: ({ companyId, ...body }) => ({ url: `/companies/${companyId}/workspaces`, method: "POST", body }),
      invalidatesTags: [{ type: "Workspace", id: "LIST" }],
    }),
    getMyWorkspaces: builder.query({
      query: () => "/workspaces/mine",
      providesTags: [{ type: "Workspace", id: "MINE" }],
    }),
    getWorkspace: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}`,
      providesTags: (result, error, id) => [{ type: "Workspace", id }],
    }),
    updateWorkspace: builder.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}`, method: "PATCH", body }),
      invalidatesTags: (result, error, { workspaceId }) => [{ type: "Workspace", id: workspaceId }],
    }),
    deleteWorkspace: builder.mutation({
      query: (workspaceId) => ({ url: `/workspaces/${workspaceId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Workspace", id: "LIST" }, { type: "Workspace", id: "MINE" }],
    }),

    // ---------- members ----------
    getWorkspaceMembers: builder.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/members`, params }),
      providesTags: (result) =>
        result
          ? [...result.data.map((m) => ({ type: "Member", id: m.id })), { type: "Member", id: "LIST" }]
          : [{ type: "Member", id: "LIST" }],
    }),
    bulkInviteMembers: builder.mutation({
      query: ({ workspaceId, members }) => ({
        url: `/workspaces/${workspaceId}/members/bulk`,
        method: "POST",
        body: { members },
      }),
      invalidatesTags: [{ type: "Member", id: "LIST" }, { type: "Workspace", id: "LIST" }],
    }),
    removeWorkspaceMembers: builder.mutation({
      query: ({ workspaceId, userIds }) => ({
        url: `/workspaces/${workspaceId}/members`,
        method: "DELETE",
        body: { userIds },
      }),
      invalidatesTags: [{ type: "Member", id: "LIST" }],
    }),
    resetMemberPassword: builder.mutation({
      query: ({ workspaceId, userId }) => ({
        url: `/workspaces/${workspaceId}/members/${userId}/reset-password`,
        method: "POST",
      }),
    }),
    sendBulkCredentials: builder.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: `/workspaces/${workspaceId}/members/send-credentials`,
        method: "POST",
        body,
      }),
    }),

    // ---------- groups ----------
    getGroups: builder.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/groups`, params }),
      providesTags: (result) =>
        result
          ? [...result.data.map((g) => ({ type: "Group", id: g.id })), { type: "Group", id: "LIST" }]
          : [{ type: "Group", id: "LIST" }],
    }),
    createGroup: builder.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}/groups`, method: "POST", body }),
      invalidatesTags: [{ type: "Group", id: "LIST" }],
    }),
    getBulkGeneratePreview: builder.query({
      query: ({ workspaceId, membersPerGroup }) => ({
        url: `/workspaces/${workspaceId}/groups/bulk-generate/preview`,
        params: { membersPerGroup },
      }),
    }),
    bulkGenerateGroups: builder.mutation({
      query: ({ workspaceId, ...body }) => ({
        url: `/workspaces/${workspaceId}/groups/bulk-generate`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Group", id: "LIST" }, { type: "Member", id: "LIST" }],
    }),
    bulkDeleteGroups: builder.mutation({
      query: ({ workspaceId, groupIds }) => ({
        url: `/workspaces/${workspaceId}/groups/bulk-delete`,
        method: "POST",
        body: { groupIds },
      }),
      invalidatesTags: [{ type: "Group", id: "LIST" }],
    }),
    bulkClearChat: builder.mutation({
      query: ({ workspaceId, groupIds }) => ({
        url: `/workspaces/${workspaceId}/groups/bulk-clear-chat`,
        method: "POST",
        body: { groupIds },
      }),
    }),
    bulkBroadcastMessage: builder.mutation({
      query: ({ workspaceId, groupIds, content }) => ({
        url: `/workspaces/${workspaceId}/groups/bulk-broadcast`,
        method: "POST",
        body: { groupIds, content },
      }),
    }),
    getGroup: builder.query({
      query: (groupId) => `/groups/${groupId}`,
      providesTags: (result, error, id) => [{ type: "Group", id }],
    }),
    updateGroupMembers: builder.mutation({
      query: ({ groupId, ...body }) => ({ url: `/groups/${groupId}/members`, method: "PATCH", body }),
      invalidatesTags: (result, error, { groupId }) => [{ type: "Group", id: groupId }, { type: "Group", id: "LIST" }],
    }),
    deleteGroup: builder.mutation({
      query: (groupId) => ({ url: `/groups/${groupId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Group", id: "LIST" }],
    }),
    getGroupMessages: builder.query({
      query: ({ groupId, after }) => ({ url: `/groups/${groupId}/messages`, params: after ? { after } : {} }),
      providesTags: (result, error, { groupId }) => [{ type: "GroupMessage", id: groupId }],
    }),
    sendGroupMessage: builder.mutation({
      query: ({ groupId, content }) => ({ url: `/groups/${groupId}/messages`, method: "POST", body: { content } }),
    }),
    clearGroupMessages: builder.mutation({
      query: (groupId) => ({ url: `/groups/${groupId}/messages`, method: "DELETE" }),
      invalidatesTags: (result, error, groupId) => [{ type: "GroupMessage", id: groupId }],
    }),

    // ---------- projects ----------
    getProjects: builder.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/projects`, params }),
      providesTags: (result) =>
        result
          ? [...result.data.map((p) => ({ type: "Project", id: p.id })), { type: "Project", id: "LIST" }]
          : [{ type: "Project", id: "LIST" }],
    }),
    createProject: builder.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}/projects`, method: "POST", body }),
      invalidatesTags: [{ type: "Project", id: "LIST" }],
    }),
    getProject: builder.query({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (result, error, id) => [{ type: "Project", id }],
    }),
    updateProject: builder.mutation({
      query: ({ projectId, ...body }) => ({ url: `/projects/${projectId}`, method: "PATCH", body }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
      ],
    }),
    deleteProject: builder.mutation({
      query: (projectId) => ({ url: `/projects/${projectId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Project", id: "LIST" }],
    }),
    notifyProjectMembers: builder.mutation({
      query: (projectId) => ({ url: `/projects/${projectId}/notify`, method: "POST" }),
    }),
    getAllGroups: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/groups/all`,
    }),

    getProjectPeople: builder.query({
      query: (projectId) => `/projects/${projectId}/people`,
      providesTags: (result, error, projectId) => [{ type: "Project", id: `${projectId}-people` }],
    }),

    // ---------- tasks ----------
    getTasks: builder.query({
      query: (projectId) => `/projects/${projectId}/tasks`,
      providesTags: (result, error, projectId) => [{ type: "Task", id: projectId }],
    }),
    createTask: builder.mutation({
      query: ({ projectId, ...body }) => ({ url: `/projects/${projectId}/tasks`, method: "POST", body }),
      invalidatesTags: (result, error, { projectId }) => [{ type: "Task", id: projectId }],
    }),
    updateTask: builder.mutation({
      query: ({ taskId, projectId, ...body }) => ({ url: `/tasks/${taskId}`, method: "PATCH", body }),
      invalidatesTags: (result, error, { projectId }) => [{ type: "Task", id: projectId }],
    }),
    deleteTask: builder.mutation({
      query: ({ taskId, projectId }) => ({ url: `/tasks/${taskId}`, method: "DELETE" }),
      invalidatesTags: (result, error, { projectId }) => [{ type: "Task", id: projectId }],
    }),
    notifyTaskAssignees: builder.mutation({
      query: (taskId) => ({ url: `/tasks/${taskId}/notify`, method: "POST" }),
    }),

    // ---------- task comments ----------
    getComments: builder.query({
      query: (taskId) => `/tasks/${taskId}/comments`,
      providesTags: (result, error, taskId) => [{ type: "Comment", id: taskId }],
    }),
    addComment: builder.mutation({
      query: ({ taskId, content }) => ({ url: `/tasks/${taskId}/comments`, method: "POST", body: { content } }),
      invalidatesTags: (result, error, { taskId }) => [{ type: "Comment", id: taskId }],
    }),
    deleteComment: builder.mutation({
      query: ({ taskId, commentId }) => ({ url: `/tasks/${taskId}/comments/${commentId}`, method: "DELETE" }),
      invalidatesTags: (result, error, { taskId }) => [{ type: "Comment", id: taskId }],
    }),

    // ---------- project documents ----------
    getDocuments: builder.query({
      query: (projectId) => `/projects/${projectId}/documents`,
      providesTags: (result, error, projectId) => [{ type: "Document", id: projectId }],
    }),
    addDocument: builder.mutation({
      query: ({ projectId, ...body }) => ({ url: `/projects/${projectId}/documents`, method: "POST", body }),
      invalidatesTags: (result, error, { projectId }) => [{ type: "Document", id: projectId }],
    }),
    deleteDocument: builder.mutation({
      query: ({ projectId, docId }) => ({ url: `/projects/${projectId}/documents/${docId}`, method: "DELETE" }),
      invalidatesTags: (result, error, { projectId }) => [{ type: "Document", id: projectId }],
    }),

    // ---------- attendance ----------
    markAttendance: builder.mutation({
      query: ({ workspaceId, imageBase64, date }) => ({
        url: `/workspaces/${workspaceId}/attendance`,
        method: "POST",
        body: { imageBase64, date },
      }),
      invalidatesTags: [{ type: "Attendance", id: "STATUS" }, { type: "Attendance", id: "MINE" }],
    }),
    checkOutAttendance: builder.mutation({
      query: ({ workspaceId, date }) => ({
        url: `/workspaces/${workspaceId}/attendance/checkout`,
        method: "POST",
        body: { date },
      }),
      invalidatesTags: [{ type: "Attendance", id: "STATUS" }, { type: "Attendance", id: "MINE" }],
    }),
    getMyAttendanceStatus: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/attendance/status`,
      providesTags: [{ type: "Attendance", id: "STATUS" }],
    }),
    getMyAttendanceHistory: builder.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/attendance/me`, params }),
      providesTags: [{ type: "Attendance", id: "MINE" }],
    }),
    getAttendanceByDate: builder.query({
      query: ({ workspaceId, date }) => ({ url: `/workspaces/${workspaceId}/attendance`, params: { date } }),
      providesTags: [{ type: "Attendance", id: "BY_DATE" }],
    }),
    sendAttendanceReminders: builder.mutation({
      query: (workspaceId) => ({ url: `/workspaces/${workspaceId}/attendance/remind`, method: "POST" }),
    }),
    deleteAttendance: builder.mutation({
      query: ({ workspaceId, attendanceId }) => ({
        url: `/workspaces/${workspaceId}/attendance/${attendanceId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Attendance", id: "BY_DATE" }],
    }),

    // ---------- leave ----------
    submitLeave: builder.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}/leave`, method: "POST", body }),
      invalidatesTags: [{ type: "Leave", id: "MINE" }],
    }),
    getMyLeaves: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/leave/me`,
      providesTags: [{ type: "Leave", id: "MINE" }],
    }),
    cancelLeave: builder.mutation({
      query: ({ workspaceId, leaveId }) => ({ url: `/workspaces/${workspaceId}/leave/${leaveId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Leave", id: "MINE" }, { type: "Leave", id: "LIST" }],
    }),
    getAllLeaves: builder.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/leave`, params }),
      providesTags: [{ type: "Leave", id: "LIST" }],
    }),
    reviewLeave: builder.mutation({
      query: ({ workspaceId, leaveId, ...body }) => ({
        url: `/workspaces/${workspaceId}/leave/${leaveId}/review`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Leave", id: "LIST" }],
    }),

    // ---------- standup ----------
    submitStandup: builder.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}/standup`, method: "POST", body }),
      invalidatesTags: [{ type: "Standup", id: "MINE" }, { type: "Standup", id: "BY_DATE" }],
    }),
    updateStandup: builder.mutation({
      query: ({ workspaceId, standupId, ...body }) => ({
        url: `/workspaces/${workspaceId}/standup/${standupId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Standup", id: "MINE" }, { type: "Standup", id: "BY_DATE" }],
    }),
    deleteStandup: builder.mutation({
      query: ({ workspaceId, standupId }) => ({ url: `/workspaces/${workspaceId}/standup/${standupId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Standup", id: "MINE" }, { type: "Standup", id: "BY_DATE" }],
    }),
    getMyStandups: builder.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/standup/me`, params }),
      providesTags: [{ type: "Standup", id: "MINE" }],
    }),
    getStandupsByDate: builder.query({
      query: ({ workspaceId, date }) => ({ url: `/workspaces/${workspaceId}/standup`, params: { date } }),
      providesTags: [{ type: "Standup", id: "BY_DATE" }],
    }),

    // ---------- notices ----------
    getNotices: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/notices`,
      providesTags: [{ type: "Notice", id: "LIST" }],
    }),
    createNotice: builder.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}/notices`, method: "POST", body }),
      invalidatesTags: [{ type: "Notice", id: "LIST" }],
    }),
    updateNotice: builder.mutation({
      query: ({ workspaceId, noticeId, ...body }) => ({
        url: `/workspaces/${workspaceId}/notices/${noticeId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Notice", id: "LIST" }],
    }),
    publishNotice: builder.mutation({
      query: ({ workspaceId, noticeId, published }) => ({
        url: `/workspaces/${workspaceId}/notices/${noticeId}/publish`,
        method: "PATCH",
        body: { published },
      }),
      invalidatesTags: [{ type: "Notice", id: "LIST" }],
    }),
    deleteNotice: builder.mutation({
      query: ({ workspaceId, noticeId }) => ({ url: `/workspaces/${workspaceId}/notices/${noticeId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Notice", id: "LIST" }],
    }),

    // ---------- notifications ----------
    getNotifications: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/notifications`,
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),
    createNotification: builder.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}/notifications`, method: "POST", body }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),
    deleteNotification: builder.mutation({
      query: ({ workspaceId, notificationId }) => ({
        url: `/workspaces/${workspaceId}/notifications/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),

    getDashboardSummary: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/dashboard-summary`,
    }),
    setMyStatus: builder.mutation({
      query: ({ workspaceId, status }) => ({
        url: `/workspaces/${workspaceId}/members/me/status`,
        method: "PATCH",
        body: { status },
      }),
    }),

    // ---------- NDA ----------
    getNdaStatus: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/nda`,
      providesTags: [{ type: "Nda", id: "STATUS" }],
    }),
    signNda: builder.mutation({
      query: ({ workspaceId, signatureName }) => ({
        url: `/workspaces/${workspaceId}/nda/sign`,
        method: "POST",
        body: { signatureName },
      }),
      invalidatesTags: [{ type: "Nda", id: "STATUS" }],
    }),

    // ---------- project messages (candidate queries) ----------
    sendProjectMessage: builder.mutation({
      query: ({ projectId, content }) => ({ url: `/projects/${projectId}/messages`, method: "POST", body: { content } }),
      invalidatesTags: (result, error, { projectId }) => [{ type: "ProjectMessage", id: projectId }],
    }),
    getMyProjectMessages: builder.query({
      query: (projectId) => `/projects/${projectId}/messages/me`,
      providesTags: (result, error, projectId) => [{ type: "ProjectMessage", id: projectId }],
    }),
    getCandidateQueries: builder.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/candidate-queries`, params }),
      providesTags: [{ type: "ProjectMessage", id: "LIST" }],
    }),

    // ---------- submissions ----------
    createSubmission: builder.mutation({
      query: ({ workspaceId, ...body }) => ({ url: `/workspaces/${workspaceId}/submissions`, method: "POST", body }),
      invalidatesTags: [{ type: "Submission", id: "MINE" }, { type: "Submission", id: "LIST" }],
    }),
    getMySubmissions: builder.query({
      query: (workspaceId) => `/workspaces/${workspaceId}/submissions/me`,
      providesTags: [{ type: "Submission", id: "MINE" }],
    }),
    getAllSubmissions: builder.query({
      query: ({ workspaceId, ...params }) => ({ url: `/workspaces/${workspaceId}/submissions`, params }),
      providesTags: [{ type: "Submission", id: "LIST" }],
    }),
    giveSubmissionFeedback: builder.mutation({
      query: ({ workspaceId, submissionId, adminFeedback }) => ({
        url: `/workspaces/${workspaceId}/submissions/${submissionId}/feedback`,
        method: "PATCH",
        body: { adminFeedback },
      }),
      invalidatesTags: [{ type: "Submission", id: "LIST" }],
    }),
  }),
});

export const {
  useLoginMutation,
  useForgotPasswordMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useGetCompaniesQuery,
  useCreateCompanyMutation,
  useDeleteCompanyMutation,
  useGetCompanyWorkspacesQuery,
  useCreateWorkspaceMutation,
  useGetMyWorkspacesQuery,
  useGetWorkspaceQuery,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetWorkspaceMembersQuery,
  useBulkInviteMembersMutation,
  useRemoveWorkspaceMembersMutation,
  useResetMemberPasswordMutation,
  useSendBulkCredentialsMutation,
  useGetGroupsQuery,
  useCreateGroupMutation,
  useGetBulkGeneratePreviewQuery,
  useLazyGetBulkGeneratePreviewQuery,
  useBulkGenerateGroupsMutation,
  useBulkDeleteGroupsMutation,
  useBulkClearChatMutation,
  useBulkBroadcastMessageMutation,
  useGetGroupQuery,
  useUpdateGroupMembersMutation,
  useDeleteGroupMutation,
  useGetGroupMessagesQuery,
  useLazyGetGroupMessagesQuery,
  useSendGroupMessageMutation,
  useClearGroupMessagesMutation,
  useGetProjectsQuery,
  useCreateProjectMutation,
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useNotifyProjectMembersMutation,
  useGetAllGroupsQuery,
  useGetProjectPeopleQuery,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useNotifyTaskAssigneesMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useGetDocumentsQuery,
  useAddDocumentMutation,
  useDeleteDocumentMutation,
  useMarkAttendanceMutation,
  useCheckOutAttendanceMutation,
  useGetDashboardSummaryQuery,
  useSetMyStatusMutation,
  useGetMyAttendanceStatusQuery,
  useGetMyAttendanceHistoryQuery,
  useGetAttendanceByDateQuery,
  useSendAttendanceRemindersMutation,
  useDeleteAttendanceMutation,
  useSubmitLeaveMutation,
  useGetMyLeavesQuery,
  useCancelLeaveMutation,
  useGetAllLeavesQuery,
  useReviewLeaveMutation,
  useSubmitStandupMutation,
  useUpdateStandupMutation,
  useDeleteStandupMutation,
  useGetMyStandupsQuery,
  useGetStandupsByDateQuery,
  useGetNoticesQuery,
  useCreateNoticeMutation,
  useUpdateNoticeMutation,
  usePublishNoticeMutation,
  useDeleteNoticeMutation,
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useDeleteNotificationMutation,
  useGetNdaStatusQuery,
  useSignNdaMutation,
  useSendProjectMessageMutation,
  useGetMyProjectMessagesQuery,
  useGetCandidateQueriesQuery,
  useCreateSubmissionMutation,
  useGetMySubmissionsQuery,
  useGetAllSubmissionsQuery,
  useGiveSubmissionFeedbackMutation,
} = apiSlice;
