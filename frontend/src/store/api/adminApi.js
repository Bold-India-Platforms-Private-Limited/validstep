import { baseApi } from './baseApi'

export const adminApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getAdminDashboard: b.query({
      query: () => '/admin/dashboard',
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
    getAdminOrders: b.query({
      query: (params) => ({ url: '/admin/orders', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Order'],
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
      invalidatesTags: ['User'],
    }),
    bulkUploadAdminUsers: b.mutation({
      query: (formData) => ({ url: '/admin/users/bulk-upload', method: 'POST', body: formData }),
      invalidatesTags: ['User'],
    }),
    importPayuButtonCustomers: b.mutation({
      query: () => ({ url: '/admin/users/import-payu-customers', method: 'POST' }),
      invalidatesTags: ['User'],
    }),
    getAdminCompanyPrograms: b.query({
      query: (companyId) => `/admin/companies/${companyId}/programs`,
      transformResponse: (r) => r.data,
      providesTags: ['Program'],
    }),
    createAdminCompanyProgram: b.mutation({
      query: ({ companyId, ...body }) => ({ url: `/admin/companies/${companyId}/programs`, method: 'POST', body }),
      invalidatesTags: (result, error, { companyId }) => ['Program', { type: 'Company', id: companyId }],
    }),
    createAdminCompanyBatch: b.mutation({
      query: ({ companyId, ...body }) => ({ url: `/admin/companies/${companyId}/batches`, method: 'POST', body }),
      invalidatesTags: (result, error, { companyId }) => ['Batch', { type: 'Company', id: companyId }],
    }),
    createAdminCompany: b.mutation({
      query: (body) => ({ url: '/admin/companies', method: 'POST', body }),
      invalidatesTags: ['Company'],
    }),
    enrollUsersInBatch: b.mutation({
      query: ({ companyId, batchId, user_ids }) => ({
        url: `/admin/companies/${companyId}/batches/${batchId}/enroll-users`,
        method: 'POST',
        body: { user_ids },
      }),
      invalidatesTags: ['Order', 'User'],
    }),
    importPayuTransactions: b.mutation({
      query: (formData) => ({ url: '/admin/users/import-payu-transactions', method: 'POST', body: formData }),
      invalidatesTags: ['User'],
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
      invalidatesTags: ['Order', 'User'],
    }),
  }),
})

export const {
  useGetAdminDashboardQuery, useGetAdminCompaniesQuery,
  useGetAdminCompanyQuery, useUpdateCompanyStatusMutation,
  useGetAdminBatchesQuery, useGetAdminBatchQuery,
  useGetAdminBatchStatsQuery, useGetAdminBatchOrdersQuery,
  useGetAdminOrdersQuery, useGetAdminPaymentsQuery,
  useGetPricingQuery, useUpdatePricingMutation,
  useIssueCertificatesAdminMutation,
  useGetAdminInvoicesQuery,
  useGetAdminUsersQuery, useCreateAdminUserMutation, useBulkUploadAdminUsersMutation,
  useImportPayuButtonCustomersMutation,
  useGetAdminCompanyProgramsQuery, useCreateAdminCompanyProgramMutation,
  useCreateAdminCompanyBatchMutation,
  useCreateAdminCompanyMutation, useEnrollUsersInBatchMutation,
  useImportPayuTransactionsMutation, useGetAssignableTransactionsQuery, useAssignTransactionsToBatchMutation,
} = adminApi
