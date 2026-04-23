import { baseApi } from './baseApi'

export const companyApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getCompanyProfile: b.query({
      query: () => '/company/profile',
      transformResponse: (r) => r.data,
      providesTags: ['Company'],
    }),
    updateCompanyProfile: b.mutation({
      query: (body) => ({ url: '/company/profile', method: 'PUT', body }),
      invalidatesTags: ['Company'],
    }),
    getCompanyDashboard: b.query({
      query: () => '/company/dashboard',
      transformResponse: (r) => r.data,
    }),
    getPrograms: b.query({
      query: (params) => ({ url: '/company/programs', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Program'],
    }),
    createProgram: b.mutation({
      query: (body) => ({ url: '/company/programs', method: 'POST', body }),
      invalidatesTags: ['Program'],
    }),
    updateProgram: b.mutation({
      query: ({ id, ...body }) => ({ url: `/company/programs/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Program'],
    }),
    deleteProgram: b.mutation({
      query: (id) => ({ url: `/company/programs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Program'],
    }),
    getPaymentHistory: b.query({
      query: (params) => ({ url: '/company/payments', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Payment'],
    }),
    getCompanyInvoices: b.query({
      query: (params) => ({ url: '/company/invoices', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Invoice'],
    }),
  }),
})

export const {
  useGetCompanyProfileQuery, useUpdateCompanyProfileMutation,
  useGetCompanyDashboardQuery,
  useGetProgramsQuery, useCreateProgramMutation,
  useUpdateProgramMutation, useDeleteProgramMutation,
  useGetPaymentHistoryQuery, useGetCompanyInvoicesQuery,
} = companyApi
