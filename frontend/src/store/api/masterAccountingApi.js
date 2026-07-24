import { baseApi } from './baseApi'

const TAG = 'MasterAccounting'

export const masterAccountingApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getGateStatus: b.query({
      query: () => ({ url: '/admin/master-accounting/gate-status' }),
      transformResponse: (r) => r.data,
    }),
    unlockMasterAccounting: b.mutation({
      query: (dob) => ({ url: '/admin/master-accounting/unlock', method: 'POST', body: { dob } }),
    }),
    lockMasterAccounting: b.mutation({
      query: () => ({ url: '/admin/master-accounting/lock', method: 'POST' }),
    }),

    getBrands: b.query({
      query: () => ({ url: '/admin/master-accounting/brands' }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getGateways: b.query({
      query: () => ({ url: '/admin/master-accounting/gateways' }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getBankAccounts: b.query({
      query: () => ({ url: '/admin/master-accounting/bank-accounts' }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),

    getCategories: b.query({
      query: () => ({ url: '/admin/master-accounting/categories' }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    createCategory: b.mutation({
      query: (body) => ({ url: '/admin/master-accounting/categories', method: 'POST', body }),
      invalidatesTags: [TAG],
    }),
    getRules: b.query({
      query: () => ({ url: '/admin/master-accounting/rules' }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    createRule: b.mutation({
      query: (body) => ({ url: '/admin/master-accounting/rules', method: 'POST', body }),
      invalidatesTags: [TAG],
    }),
    updateRule: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/master-accounting/rules/${id}`, method: 'PATCH', body }),
      invalidatesTags: [TAG],
    }),
    runReclassification: b.mutation({
      query: () => ({ url: '/admin/master-accounting/rules/reclassify', method: 'POST' }),
      invalidatesTags: [TAG],
    }),

    importRazorpayPayments: b.mutation({
      query: ({ file, periodType, periodLabel }) => {
        const formData = new FormData(); formData.append('file', file)
        if (periodType) formData.append('periodType', periodType)
        if (periodLabel) formData.append('periodLabel', periodLabel)
        return { url: '/admin/master-accounting/imports/razorpay-payments', method: 'POST', body: formData }
      },
      invalidatesTags: [TAG],
    }),
    importRazorpaySettlements: b.mutation({
      query: ({ file, periodType, periodLabel }) => {
        const formData = new FormData(); formData.append('file', file)
        if (periodType) formData.append('periodType', periodType)
        if (periodLabel) formData.append('periodLabel', periodLabel)
        return { url: '/admin/master-accounting/imports/razorpay-settlements', method: 'POST', body: formData }
      },
      invalidatesTags: [TAG],
    }),
    importPayuTransactions: b.mutation({
      query: ({ file, periodType, periodLabel }) => {
        const formData = new FormData(); formData.append('file', file)
        if (periodType) formData.append('periodType', periodType)
        if (periodLabel) formData.append('periodLabel', periodLabel)
        return { url: '/admin/master-accounting/imports/payu-transactions', method: 'POST', body: formData }
      },
      invalidatesTags: [TAG],
    }),
    importPayuSettlements: b.mutation({
      query: ({ file, periodType, periodLabel }) => {
        const formData = new FormData(); formData.append('file', file)
        if (periodType) formData.append('periodType', periodType)
        if (periodLabel) formData.append('periodLabel', periodLabel)
        return { url: '/admin/master-accounting/imports/payu-settlements', method: 'POST', body: formData }
      },
      invalidatesTags: [TAG],
    }),
    importBankStatement: b.mutation({
      query: ({ file, periodType, periodLabel }) => {
        const formData = new FormData(); formData.append('file', file)
        if (periodType) formData.append('periodType', periodType)
        if (periodLabel) formData.append('periodLabel', periodLabel)
        return { url: '/admin/master-accounting/imports/bank-statement', method: 'POST', body: formData }
      },
      invalidatesTags: [TAG],
    }),
    runReconciliation: b.mutation({
      query: () => ({ url: '/admin/master-accounting/reconciliation/run', method: 'POST' }),
      invalidatesTags: [TAG],
    }),

    previewRazorpayPayments: b.mutation({
      query: (file) => {
        const formData = new FormData(); formData.append('file', file)
        return { url: '/admin/master-accounting/imports/razorpay-payments/preview', method: 'POST', body: formData }
      },
    }),
    previewRazorpaySettlements: b.mutation({
      query: (file) => {
        const formData = new FormData(); formData.append('file', file)
        return { url: '/admin/master-accounting/imports/razorpay-settlements/preview', method: 'POST', body: formData }
      },
    }),
    previewPayuTransactions: b.mutation({
      query: (file) => {
        const formData = new FormData(); formData.append('file', file)
        return { url: '/admin/master-accounting/imports/payu-transactions/preview', method: 'POST', body: formData }
      },
    }),
    previewPayuSettlements: b.mutation({
      query: (file) => {
        const formData = new FormData(); formData.append('file', file)
        return { url: '/admin/master-accounting/imports/payu-settlements/preview', method: 'POST', body: formData }
      },
    }),
    previewBankStatement: b.mutation({
      query: (file) => {
        const formData = new FormData(); formData.append('file', file)
        return { url: '/admin/master-accounting/imports/bank-statement/preview', method: 'POST', body: formData }
      },
    }),

    getBankLedger: b.query({
      query: (params) => ({ url: '/admin/master-accounting/bank-ledger', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    createManualEntry: b.mutation({
      query: (body) => ({ url: '/admin/master-accounting/bank-ledger/manual-entry', method: 'POST', body }),
      invalidatesTags: [TAG],
    }),
    retagBankTransaction: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/master-accounting/bank-ledger/${id}/tag`, method: 'PATCH', body }),
      invalidatesTags: [TAG],
    }),

    getTrend: b.query({
      query: (params) => ({ url: '/admin/master-accounting/reports/trend', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getTrendByType: b.query({
      query: (params) => ({ url: '/admin/master-accounting/reports/trend-by-type', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getBrandPnL: b.query({
      query: (params) => ({ url: '/admin/master-accounting/reports/brand-pnl', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getCategorySummary: b.query({
      query: (params) => ({ url: '/admin/master-accounting/reports/category-summary', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getMonthCoverage: b.query({
      query: () => ({ url: '/admin/master-accounting/reports/coverage' }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),

    getRazorpayPayments: b.query({
      query: (params) => ({ url: '/admin/master-accounting/razorpay-payments', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getPayuTransactions: b.query({
      query: (params) => ({ url: '/admin/master-accounting/payu-transactions', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),

    getFileArchive: b.query({
      query: (params) => ({ url: '/admin/master-accounting/files', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getFilePreview: b.query({
      query: ({ id, ...params }) => ({ url: `/admin/master-accounting/files/${id}/preview`, params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getImportedRows: b.query({
      query: ({ id, ...params }) => ({ url: `/admin/master-accounting/files/${id}/imported-rows`, params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    deleteFileArchive: b.mutation({
      query: (id) => ({ url: `/admin/master-accounting/files/${id}`, method: 'DELETE' }),
      invalidatesTags: [TAG],
    }),

    getGatewayChargesTrend: b.query({
      query: (params) => ({ url: '/admin/master-accounting/reports/gateway-charges', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),

    getInvoiceAnalytics: b.query({
      query: (params) => ({ url: '/admin/master-accounting/invoices/analytics', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getSalesRegisterPayu: b.query({
      query: (params) => ({ url: '/admin/master-accounting/sales-register/payu', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getSalesRegisterRazorpay: b.query({
      query: (params) => ({ url: '/admin/master-accounting/sales-register/razorpay', params }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),

    getPayuBankCreditChain: b.query({
      query: (payuId) => ({ url: `/admin/master-accounting/bank-credit-chain/payu/${payuId}` }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
    getRazorpayBankCreditChain: b.query({
      query: (razorpayId) => ({ url: `/admin/master-accounting/bank-credit-chain/razorpay/${razorpayId}` }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),

    getDistinctStatuses: b.query({
      query: (gateway) => ({ url: '/admin/master-accounting/statuses', params: { gateway } }),
      transformResponse: (r) => r.data,
      providesTags: [TAG],
    }),
  }),
})

export const {
  useGetGateStatusQuery,
  useUnlockMasterAccountingMutation,
  useLockMasterAccountingMutation,
  useGetBrandsQuery,
  useGetGatewaysQuery,
  useGetBankAccountsQuery,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetRulesQuery,
  useCreateRuleMutation,
  useUpdateRuleMutation,
  useRunReclassificationMutation,
  useImportRazorpayPaymentsMutation,
  useImportRazorpaySettlementsMutation,
  useImportPayuTransactionsMutation,
  useImportPayuSettlementsMutation,
  useImportBankStatementMutation,
  usePreviewRazorpayPaymentsMutation,
  usePreviewRazorpaySettlementsMutation,
  usePreviewPayuTransactionsMutation,
  usePreviewPayuSettlementsMutation,
  usePreviewBankStatementMutation,
  useRunReconciliationMutation,
  useGetBankLedgerQuery,
  useCreateManualEntryMutation,
  useRetagBankTransactionMutation,
  useGetTrendQuery,
  useGetTrendByTypeQuery,
  useGetBrandPnLQuery,
  useGetCategorySummaryQuery,
  useGetMonthCoverageQuery,
  useGetRazorpayPaymentsQuery,
  useGetPayuTransactionsQuery,
  useGetFileArchiveQuery,
  useGetFilePreviewQuery,
  useGetImportedRowsQuery,
  useDeleteFileArchiveMutation,
  useGetGatewayChargesTrendQuery,
  useGetInvoiceAnalyticsQuery,
  useGetSalesRegisterPayuQuery,
  useGetSalesRegisterRazorpayQuery,
  useGetPayuBankCreditChainQuery,
  useGetRazorpayBankCreditChainQuery,
  useGetDistinctStatusesQuery,
} = masterAccountingApi
