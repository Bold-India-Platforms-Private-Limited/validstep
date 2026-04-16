import { createApi } from '@reduxjs/toolkit/query/react'
import { createBaseQuery } from './baseQuery'

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: createBaseQuery(import.meta.env.VITE_API_URL),
  tagTypes: ['UserOrder', 'UserCertificate', 'UserPayment'],
  endpoints: (builder) => ({
    getUserOrders: builder.query({
      query: (params) => ({ url: '/user/orders', params }),
      providesTags: ['UserOrder'],
      // Poll every 30s so certificate issuance is reflected quickly
      keepUnusedDataFor: 30,
    }),
    getUserCertificates: builder.query({
      query: () => '/user/certificates',
      providesTags: ['UserCertificate'],
    }),
    getUserProfile: builder.query({
      query: () => '/user/profile',
    }),
    updateUserProfile: builder.mutation({
      query: (data) => ({ url: '/user/profile', method: 'PUT', body: data }),
    }),
    getUserPayments: builder.query({
      query: (params) => ({ url: '/user/payments', params }),
      providesTags: ['UserPayment'],
    }),
  }),
})

export const {
  useGetUserOrdersQuery,
  useGetUserCertificatesQuery,
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useGetUserPaymentsQuery,
} = userApi
