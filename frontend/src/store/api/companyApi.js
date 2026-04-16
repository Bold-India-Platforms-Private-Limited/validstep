import { createApi } from '@reduxjs/toolkit/query/react'
import { createBaseQuery } from './baseQuery'

export const companyApi = createApi({
  reducerPath: 'companyApi',
  baseQuery: createBaseQuery(import.meta.env.VITE_API_URL),
  tagTypes: ['Company', 'Program', 'Batch', 'Order', 'Certificate', 'Template'],
  endpoints: (builder) => ({
    getCompanyProfile: builder.query({
      query: () => '/company/profile',
      providesTags: ['Company'],
    }),
    updateCompanyProfile: builder.mutation({
      query: (data) => ({ url: '/company/profile', method: 'PUT', body: data }),
      invalidatesTags: ['Company'],
    }),
    // Dashboard stats — backend: GET /company/dashboard
    getCompanyStats: builder.query({
      query: () => '/company/dashboard',
    }),
    // Programs
    getPrograms: builder.query({
      query: (params) => ({ url: '/company/programs', params }),
      providesTags: ['Program'],
    }),
    createProgram: builder.mutation({
      query: (data) => ({ url: '/company/programs', method: 'POST', body: data }),
      invalidatesTags: ['Program'],
    }),
    updateProgram: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/company/programs/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Program'],
    }),
    deleteProgram: builder.mutation({
      query: (id) => ({ url: `/company/programs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Program'],
    }),
    // Batches — mounted at /api/company/batches in app.js
    getBatches: builder.query({
      query: (params) => ({ url: '/company/batches', params }),
      providesTags: ['Batch'],
    }),
    getBatch: builder.query({
      query: (id) => `/company/batches/${id}`,
      providesTags: (result, error, id) => [{ type: 'Batch', id }],
    }),
    createBatch: builder.mutation({
      query: (data) => ({ url: '/company/batches', method: 'POST', body: data }),
      invalidatesTags: ['Batch'],
    }),
    updateBatch: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/company/batches/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Batch', id }, 'Batch'],
    }),
    // Templates — backend: POST /company/batches/:id/templates, GET /company/batches/:id/templates
    getBatchTemplates: builder.query({
      query: (batchId) => `/company/batches/${batchId}/templates`,
      providesTags: ['Template'],
    }),
    saveBatchTemplate: builder.mutation({
      query: ({ batchId, ...data }) => ({
        url: `/company/batches/${batchId}/templates`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Template', 'Batch'],
    }),
    // Orders
    getBatchOrders: builder.query({
      query: ({ batchId, ...params }) => ({ url: `/company/batches/${batchId}/orders`, params }),
      providesTags: ['Order'],
    }),
    exportBatchOrders: builder.query({
      query: ({ batchId, ...params }) => ({ url: `/company/batches/${batchId}/orders/export`, params }),
    }),
    // Company payment history
    getCompanyPayments: builder.query({
      query: (params) => ({ url: '/company/payments', params }),
    }),
    // Certificates for a batch (company view)
    getBatchCertificates: builder.query({
      query: (batchId) => `/company/batches/${batchId}/certificates`,
      providesTags: ['Certificate'],
    }),
    // Issue certificates — backend: POST /company/batches/:id/issue-certificates
    issueCertificates: builder.mutation({
      query: ({ batchId, orderIds }) => ({
        url: `/company/batches/${batchId}/issue-certificates`,
        method: 'POST',
        body: { order_ids: orderIds },
      }),
      invalidatesTags: ['Order', 'Certificate'],
    }),
  }),
})

export const {
  useGetCompanyProfileQuery,
  useUpdateCompanyProfileMutation,
  useGetCompanyStatsQuery,
  useGetProgramsQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
  useGetBatchesQuery,
  useGetBatchQuery,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useGetBatchTemplatesQuery,
  useSaveBatchTemplateMutation,
  useGetBatchCertificatesQuery,
  useGetBatchOrdersQuery,
  useExportBatchOrdersQuery,
  useIssueCertificatesMutation,
  useGetCompanyPaymentsQuery,
} = companyApi
