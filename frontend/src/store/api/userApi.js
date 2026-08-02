import { baseApi } from './baseApi'

export const userApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getUserProfile: b.query({
      query: () => '/user/profile',
      transformResponse: (r) => r.data,
      providesTags: ['User'],
    }),
    updateUserProfile: b.mutation({
      query: (body) => ({ url: '/user/profile', method: 'PUT', body }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['User'],
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
    getUserDeliveryLog: b.query({
      query: () => '/user/delivery-log',
      transformResponse: (r) => r.data,
    }),
    getMyQueries: b.query({
      query: () => '/user/queries',
      transformResponse: (r) => r.data,
      providesTags: ['Query'],
    }),
    createQuery: b.mutation({
      query: (body) => ({ url: '/user/queries', method: 'POST', body }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['Query'],
    }),
  }),
})

export const {
  useGetUserProfileQuery, useUpdateUserProfileMutation, useGetUserOrdersQuery,
  useGetUserCertificatesQuery, useGetCertificateQuery,
  useDownloadCertificateMutation, useGetUserInvoicesQuery,
  useGetUserDeliveryLogQuery,
  useGetMyQueriesQuery, useCreateQueryMutation,
} = userApi
