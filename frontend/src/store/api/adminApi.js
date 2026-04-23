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
    reconcilePayment: b.mutation({
      query: (txnid) => ({ url: `/payment/reconcile/${txnid}`, method: 'POST' }),
    }),
    getAdminInvoices: b.query({
      query: (params) => ({ url: '/admin/invoices', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Invoice'],
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
  useIssueCertificatesAdminMutation, useReconcilePaymentMutation,
  useGetAdminInvoicesQuery,
} = adminApi
