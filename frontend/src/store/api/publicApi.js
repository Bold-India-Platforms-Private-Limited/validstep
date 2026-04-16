import { createApi } from '@reduxjs/toolkit/query/react'
import { createBaseQuery } from './baseQuery'

export const publicApi = createApi({
  reducerPath: 'publicApi',
  baseQuery: createBaseQuery(import.meta.env.VITE_API_URL),
  endpoints: (builder) => ({
    getBatchBySlug: builder.query({
      query: (slug) => `/public/batch/${slug}`,
    }),
    verifyCertificate: builder.query({
      query: (hash) => `/public/verify/${hash}`,
    }),
  }),
})

export const { useGetBatchBySlugQuery, useVerifyCertificateQuery } = publicApi
