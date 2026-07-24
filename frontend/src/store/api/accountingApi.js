import { baseApi } from './baseApi'

export const accountingApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getAccountingSummary: b.query({
      query: (params) => ({ url: '/admin/accounting/summary', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Accounting'],
    }),
    getAccountingImports: b.query({
      query: (params) => ({ url: '/admin/accounting/imports', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Accounting'],
    }),
    uploadAccountingFile: b.mutation({
      query: ({ type, file }) => {
        const formData = new FormData()
        formData.append('type', type)
        formData.append('file', file)
        return { url: '/admin/accounting/imports', method: 'POST', body: formData }
      },
      invalidatesTags: ['Accounting'],
    }),
    getReconciliation: b.query({
      query: (params) => ({ url: '/admin/accounting/reconciliation', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Accounting'],
    }),
    runReconciliation: b.mutation({
      query: () => ({ url: '/admin/accounting/reconciliation/run', method: 'POST' }),
      invalidatesTags: ['Accounting'],
    }),
    getFeeStatements: b.query({
      query: (params) => ({ url: '/admin/accounting/fee-statement', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Accounting'],
    }),
  }),
})

export const {
  useGetAccountingSummaryQuery,
  useGetAccountingImportsQuery,
  useUploadAccountingFileMutation,
  useGetReconciliationQuery,
  useRunReconciliationMutation,
  useGetFeeStatementsQuery,
} = accountingApi
