import { createApi } from '@reduxjs/toolkit/query/react'
import { createBaseQuery } from './baseQuery'

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: createBaseQuery(import.meta.env.VITE_API_URL),
  endpoints: (builder) => ({
    initiatePayment: builder.mutation({
      query: (data) => ({ url: '/payment/initiate', method: 'POST', body: data }),
    }),
  }),
})

export const { useInitiatePaymentMutation } = paymentApi
