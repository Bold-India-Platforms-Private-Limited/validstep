import { baseApi } from './baseApi'

export const publicApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getBatchBySlug: b.query({
      query: (slug) => `/public/batch/${slug}`,
      transformResponse: (r) => r.data,
    }),
    verifyCertificate: b.query({
      query: (hash) => `/public/verify/${hash}`,
      transformResponse: (r) => r.data,
    }),
  }),
})

export const { useGetBatchBySlugQuery, useVerifyCertificateQuery } = publicApi
