import { baseApi } from './baseApi'

export const userApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getUserProfile: b.query({
      query: () => '/user/profile',
      transformResponse: (r) => r.data,
      providesTags: ['User'],
    }),
    getUserOrders: b.query({
      query: () => '/user/orders',
      transformResponse: (r) => r.data,
      providesTags: ['Order'],
    }),
    getUserCertificates: b.query({
      query: () => '/user/certificates',
      transformResponse: (r) => r.data,
      providesTags: ['Certificate'],
    }),
    getCertificate: b.query({
      query: (id) => `/user/certificates/${id}`,
      transformResponse: (r) => r.data,
    }),
    downloadCertificate: b.mutation({
      query: (id) => ({ url: `/user/certificates/${id}/download`, method: 'GET' }),
      transformResponse: (r) => r.data,
    }),
    getUserInvoices: b.query({
      query: (params) => ({ url: '/user/invoices', params }),
      transformResponse: (r) => r.data,
      providesTags: ['Invoice'],
    }),
  }),
})

export const {
  useGetUserProfileQuery, useGetUserOrdersQuery,
  useGetUserCertificatesQuery, useGetCertificateQuery,
  useDownloadCertificateMutation, useGetUserInvoicesQuery,
} = userApi
