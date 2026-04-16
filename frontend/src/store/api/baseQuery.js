import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const rawBaseQuery = (baseUrl) =>
  fetchBaseQuery({
    baseUrl,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.accessToken
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  })

/**
 * Auto-unwraps the backend's { success, data, message } envelope.
 * Components receive `data` directly — no `.data.data` needed.
 */
export const createBaseQuery = (baseUrl) => async (args, api, extraOptions) => {
  const result = await rawBaseQuery(baseUrl)(args, api, extraOptions)
  if (result.data !== undefined) {
    // Unwrap envelope: return only the `data` field
    return { data: result.data?.data ?? result.data }
  }
  // Pass errors through unchanged
  return result
}
