import { baseApi } from './baseApi'

export const batchApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getBatches: b.query({
      query: (params) => ({ url: '/company/batches', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Batch'],
    }),
    getBatch: b.query({
      query: (id) => `/company/batches/${id}`,
      transformResponse: (r) => r.data,
      providesTags: (r, e, id) => [{ type: 'Batch', id }],
    }),
    createBatch: b.mutation({
      query: (body) => ({ url: '/company/batches', method: 'POST', body }),
      invalidatesTags: ['Batch'],
    }),
    updateBatch: b.mutation({
      query: ({ id, ...body }) => ({ url: `/company/batches/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'Batch', id }, 'Batch'],
    }),
    getBatchTemplates: b.query({
      query: (id) => `/company/batches/${id}/templates`,
      transformResponse: (r) => r.data,
      providesTags: (r, e, id) => [{ type: 'Batch', id }],
    }),
    saveTemplate: b.mutation({
      query: ({ batchId, ...body }) => ({ url: `/company/batches/${batchId}/templates`, method: 'POST', body }),
      invalidatesTags: (r, e, { batchId }) => [{ type: 'Batch', id: batchId }],
    }),
    getBatchOrders: b.query({
      query: ({ id, ...params }) => ({ url: `/company/batches/${id}/orders`, params }),
      transformResponse: (r) => r.data,
      providesTags: ['Order'],
    }),
    getBatchCertificates: b.query({
      query: ({ id, ...params }) => ({ url: `/company/batches/${id}/certificates`, params }),
      transformResponse: (r) => r.data,
      providesTags: ['Certificate'],
    }),
    issueCertificates: b.mutation({
      query: ({ batchId, order_ids }) => ({
        url: `/company/batches/${batchId}/issue-certificates`,
        method: 'POST',
        body: { order_ids },
      }),
      invalidatesTags: ['Certificate', 'Order'],
    }),
  }),
})

export const {
  useGetBatchesQuery, useGetBatchQuery,
  useCreateBatchMutation, useUpdateBatchMutation,
  useGetBatchTemplatesQuery, useSaveTemplateMutation,
  useGetBatchOrdersQuery, useGetBatchCertificatesQuery,
  useIssueCertificatesMutation,
} = batchApi
