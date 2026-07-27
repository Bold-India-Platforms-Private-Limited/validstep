import { baseApi } from './baseApi'

export const adminApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getAdminDashboard: b.query({
      query: () => '/admin/dashboard',
      transformResponse: (r) => r.data,
    }),
    getAdminWhoami: b.query({
      query: () => '/admin/whoami',
      transformResponse: (r) => r.data,
    }),
    getAdminAnalytics: b.query({
      query: (params) => ({ url: '/admin/analytics', params }),
      transformResponse: (r) => r.data,
    }),
    getAdminCompanies: b.query({
      query: (params) => ({ url: '/admin/companies', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Company'],
    }),
    getAdminCompany: b.query({
      query: (id) => `/admin/companies/${id}`,
      transformResponse: (r) => r.data,
      providesTags: (result, error, id) => [{ type: 'Company', id }],
    }),
    updateCompanyStatus: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/companies/${id}/status`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => ['Company', { type: 'Company', id }],
    }),
    deleteAdminCompany: b.mutation({
      query: (id) => ({ url: `/admin/companies/${id}`, method: 'DELETE' }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['Company'],
    }),
    resendCompanyPassword: b.mutation({
      query: (id) => ({ url: `/admin/companies/${id}/resend-password`, method: 'POST' }),
      transformResponse: (r) => r.data,
    }),
    getAdminBatches: b.query({
      query: (params) => ({ url: '/admin/batches', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Batch'],
    }),
    getAdminBatch: b.query({
      query: (id) => `/admin/batches/${id}`,
      transformResponse: (r) => r.data,
    }),
    getAdminBatchStats: b.query({
      query: (id) => `/admin/batches/${id}/stats`,
      transformResponse: (r) => r.data,
    }),
    getAdminBatchOrders: b.query({
      query: ({ id, ...params }) => ({ url: `/admin/batches/${id}/orders`, params }),
      transformResponse: (r) => r.data,
    }),
    getAdminPayments: b.query({
      query: (params) => ({ url: '/admin/payments', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Payment'],
    }),
    getPricing: b.query({
      query: () => '/admin/pricing',
      transformResponse: (r) => r.data,
    }),
    updatePricing: b.mutation({
      query: (body) => ({ url: '/admin/pricing', method: 'PUT', body }),
      invalidatesTags: ['Admin'],
    }),
    issueCertificatesAdmin: b.mutation({
      query: ({ batchId, order_ids }) => ({
        url: `/admin/batches/${batchId}/issue`,
        method: 'POST',
        body: { order_ids },
      }),
      invalidatesTags: ['Certificate', 'Order'],
    }),
    getAdminInvoices: b.query({
      query: (params) => ({ url: '/admin/invoices', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Invoice'],
    }),
    getAdminUsers: b.query({
      query: (params) => ({ url: '/admin/users', params }),
      transformResponse: (r) => r.data,
      providesTags: ['User'],
    }),
    createAdminUser: b.mutation({
      query: (body) => ({ url: '/admin/users', method: 'POST', body }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['User'],
    }),
    deleteAdminUsers: b.mutation({
      query: (user_ids) => ({ url: '/admin/users', method: 'DELETE', body: { user_ids } }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['User'],
    }),
    bulkUploadAdminUsers: b.mutation({
      query: (formData) => ({ url: '/admin/users/bulk-upload', method: 'POST', body: formData }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['User'],
    }),
    importPayuButtonCustomers: b.mutation({
      query: () => ({ url: '/admin/users/import-payu-customers', method: 'POST' }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['User'],
    }),
    getAdminCompanyPrograms: b.query({
      query: (companyId) => `/admin/companies/${companyId}/programs`,
      transformResponse: (r) => r.data,
      providesTags: ['Program'],
    }),
    createAdminCompanyProgram: b.mutation({
      query: ({ companyId, ...body }) => ({ url: `/admin/companies/${companyId}/programs`, method: 'POST', body }),
      transformResponse: (r) => r.data,
      invalidatesTags: (result, error, { companyId }) => ['Program', { type: 'Company', id: companyId }],
    }),
    createAdminCompanyBatch: b.mutation({
      query: ({ companyId, ...body }) => ({ url: `/admin/companies/${companyId}/batches`, method: 'POST', body }),
      transformResponse: (r) => r.data,
      invalidatesTags: (result, error, { companyId }) => ['Batch', { type: 'Company', id: companyId }],
    }),
    updateAdminCompanyBatch: b.mutation({
      query: ({ companyId, id, ...body }) => ({ url: `/admin/companies/${companyId}/batches/${id}`, method: 'PUT', body }),
      transformResponse: (r) => r.data,
      invalidatesTags: (result, error, { companyId }) => ['Batch', { type: 'Company', id: companyId }],
    }),
    deleteAdminCompanyBatch: b.mutation({
      query: ({ companyId, id }) => ({ url: `/admin/companies/${companyId}/batches/${id}`, method: 'DELETE' }),
      transformResponse: (r) => r.data,
      invalidatesTags: (result, error, { companyId }) => ['Batch', { type: 'Company', id: companyId }],
    }),
    createAdminCompany: b.mutation({
      query: (body) => ({ url: '/admin/companies', method: 'POST', body }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['Company'],
    }),
    enrollUsersInBatch: b.mutation({
      query: ({ companyId, batchId, user_ids }) => ({
        url: `/admin/companies/${companyId}/batches/${batchId}/enroll-users`,
        method: 'POST',
        body: { user_ids },
      }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['Order', 'User'],
    }),
    getAssignableTransactions: b.query({
      query: (params) => ({ url: '/admin/payu-transactions/assignable', params }),
      transformResponse: (r) => r.data,
    }),
    assignTransactionsToBatch: b.mutation({
      query: ({ companyId, batchId, payu_ids }) => ({
        url: `/admin/companies/${companyId}/batches/${batchId}/assign-transactions`,
        method: 'POST',
        body: { payu_ids },
      }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['Order', 'User'],
    }),
    getAdminOrderLog: b.query({
      query: (params) => ({ url: '/admin/order-log', params }),
      transformResponse: (r) => r.data,
      providesTags: ['OrderLog'],
    }),
    getAdminOrderDetail: b.query({
      query: (orderId) => `/admin/order-log/${orderId}`,
      transformResponse: (r) => r.data,
      providesTags: (result, error, orderId) => [{ type: 'OrderLog', id: orderId }],
    }),
    resolveAdminQuery: b.mutation({
      query: (queryId) => ({ url: `/admin/queries/${queryId}/resolve`, method: 'PUT' }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['OrderLog'],
    }),
    resendUserPassword: b.mutation({
      query: (userId) => ({ url: `/admin/users/${userId}/resend-password`, method: 'POST' }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['OrderLog'],
    }),
    resendCertificateEmail: b.mutation({
      query: (orderId) => ({ url: `/admin/order-log/${orderId}/send-certificate-email`, method: 'POST' }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['OrderLog'],
    }),
  }),
})

export const {
  useGetAdminDashboardQuery, useGetAdminWhoamiQuery, useGetAdminAnalyticsQuery, useGetAdminCompaniesQuery,
  useGetAdminCompanyQuery, useUpdateCompanyStatusMutation,
  useDeleteAdminCompanyMutation, useResendCompanyPasswordMutation,
  useGetAdminBatchesQuery, useGetAdminBatchQuery,
  useGetAdminBatchStatsQuery, useGetAdminBatchOrdersQuery,
  useGetAdminPaymentsQuery,
  useGetPricingQuery, useUpdatePricingMutation,
  useIssueCertificatesAdminMutation,
  useGetAdminInvoicesQuery,
  useGetAdminUsersQuery, useCreateAdminUserMutation, useBulkUploadAdminUsersMutation,
  useDeleteAdminUsersMutation,
  useImportPayuButtonCustomersMutation,
  useGetAdminCompanyProgramsQuery, useCreateAdminCompanyProgramMutation,
  useCreateAdminCompanyBatchMutation, useUpdateAdminCompanyBatchMutation, useDeleteAdminCompanyBatchMutation,
  useCreateAdminCompanyMutation, useEnrollUsersInBatchMutation,
  useGetAssignableTransactionsQuery, useAssignTransactionsToBatchMutation,
  useGetAdminOrderLogQuery, useGetAdminOrderDetailQuery, useResolveAdminQueryMutation,
  useResendUserPasswordMutation, useResendCertificateEmailMutation,
} = adminApi
