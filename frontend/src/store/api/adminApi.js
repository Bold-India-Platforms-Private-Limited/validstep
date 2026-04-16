import { createApi } from '@reduxjs/toolkit/query/react'
import { createBaseQuery } from './baseQuery'

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: createBaseQuery(import.meta.env.VITE_API_URL),
  tagTypes: ['AdminCompany', 'AdminBatch', 'AdminOrder', 'Pricing', 'AdminBatchOrder', 'AdminCert'],
  endpoints: (builder) => ({
    // Dashboard stats — backend route: GET /admin/dashboard
    getAdminStats: builder.query({
      query: () => '/admin/dashboard',
    }),
    // Companies
    getAdminCompanies: builder.query({
      query: (params) => ({ url: '/admin/companies', params }),
      providesTags: ['AdminCompany'],
    }),
    getAdminCompany: builder.query({
      query: (id) => `/admin/companies/${id}`,
      providesTags: (result, error, id) => [{ type: 'AdminCompany', id }],
    }),
    // Toggle status — backend: PUT /admin/companies/:id/status { is_active, is_verified }
    updateCompanyStatus: builder.mutation({
      query: ({ id, is_active, is_verified }) => ({
        url: `/admin/companies/${id}/status`,
        method: 'PUT',
        body: { is_active, is_verified },
      }),
      invalidatesTags: ['AdminCompany'],
    }),
    // Batches & Orders
    getAdminBatches: builder.query({
      query: (params) => ({ url: '/admin/batches', params }),
      providesTags: ['AdminBatch'],
    }),
    getAdminBatch: builder.query({
      query: (id) => `/admin/batches/${id}`,
      providesTags: (r, e, id) => [{ type: 'AdminBatch', id }],
    }),
    getAdminBatchStats: builder.query({
      query: (id) => `/admin/batches/${id}/stats`,
      providesTags: (r, e, id) => [{ type: 'AdminBatchOrder', id }],
    }),
    getAdminBatchOrders: builder.query({
      query: ({ batchId, ...params }) => ({ url: `/admin/batches/${batchId}/orders`, params }),
      providesTags: (r, e, { batchId }) => [{ type: 'AdminBatchOrder', id: batchId }],
    }),
    getAdminBatchCertificates: builder.query({
      query: (batchId) => `/admin/batches/${batchId}/certificates`,
      providesTags: (r, e, id) => [{ type: 'AdminCert', id }],
    }),
    issueAdminCertificates: builder.mutation({
      query: ({ batchId, orderIds }) => ({
        url: `/admin/batches/${batchId}/issue`,
        method: 'POST',
        body: { order_ids: orderIds },
      }),
      invalidatesTags: (r, e, { batchId }) => [
        { type: 'AdminBatchOrder', id: batchId },
        { type: 'AdminCert', id: batchId },
      ],
    }),
    saveAdminBatchTemplate: builder.mutation({
      query: ({ batchId, ...body }) => ({
        url: `/company/batches/${batchId}/templates`,
        method: 'POST',
        body,
      }),
    }),
    getAdminOrders: builder.query({
      query: (params) => ({ url: '/admin/orders', params }),
      providesTags: ['AdminOrder'],
    }),
    // Payments
    getAdminPayments: builder.query({
      query: (params) => ({ url: '/admin/payments', params }),
    }),
    // Pricing — backend: GET/PUT /admin/pricing  (PUT body: { program_type, default_price })
    getPricing: builder.query({
      query: () => '/admin/pricing',
      providesTags: ['Pricing'],
    }),
    updatePricing: builder.mutation({
      query: ({ program_type, default_price }) => ({
        url: '/admin/pricing',
        method: 'PUT',
        body: { program_type, default_price },
      }),
      invalidatesTags: ['Pricing'],
    }),
  }),
})

export const {
  useGetAdminStatsQuery,
  useGetAdminCompaniesQuery,
  useGetAdminCompanyQuery,
  useUpdateCompanyStatusMutation,
  useGetAdminBatchesQuery,
  useGetAdminBatchQuery,
  useGetAdminBatchStatsQuery,
  useGetAdminBatchOrdersQuery,
  useGetAdminBatchCertificatesQuery,
  useIssueAdminCertificatesMutation,
  useSaveAdminBatchTemplateMutation,
  useGetAdminOrdersQuery,
  useGetAdminPaymentsQuery,
  useGetPricingQuery,
  useUpdatePricingMutation,
} = adminApi
