import { baseApi } from './baseApi'

// Public Certificate Repository — admin endpoints. Self-contained module, unrelated to the
// batch/order certificate APIs in adminApi.js.
export const certRepoApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    matchPublicCerts: b.mutation({
      query: (formData) => ({ url: '/admin/certificate-repo/match', method: 'POST', body: formData }),
      transformResponse: (r) => r.data,
    }),
    startPublicCertUpload: b.mutation({
      query: ({ match_token, source_label }) => ({
        url: '/admin/certificate-repo/start',
        method: 'POST',
        body: { match_token, source_label },
      }),
      transformResponse: (r) => r.data,
      invalidatesTags: ['PublicCert'],
    }),
    getPublicCertUploadStatus: b.query({
      query: (jobId) => `/admin/certificate-repo/status/${jobId}`,
      transformResponse: (r) => r.data,
    }),
    getPublicCertRecords: b.query({
      query: (params) => ({ url: '/admin/certificate-repo/records', params }),
      transformResponse: (r) => r.data,
      providesTags: ['PublicCert'],
    }),
  }),
})

export const {
  useMatchPublicCertsMutation,
  useStartPublicCertUploadMutation,
  useGetPublicCertUploadStatusQuery,
  useGetPublicCertRecordsQuery,
} = certRepoApi
