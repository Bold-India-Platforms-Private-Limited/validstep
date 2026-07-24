import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { setCredentials, clearCredentials } from '../authSlice'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// Access tokens are short-lived (15m); without this, every query starts failing with 401 once
// it expires even though the httpOnly refresh cookie (7d) is still valid — which reads as
// "logged out" mid-session. On a 401, silently refresh once and retry the original request.
// Concurrent 401s share a single in-flight refresh call instead of each firing their own.
let refreshPromise = null

async function baseQueryWithReauth(args, api, extraOptions) {
  let result = await rawBaseQuery(args, api, extraOptions)

  const url = typeof args === 'string' ? args : args.url
  const isAuthRequest = url?.startsWith('/auth')

  if (result.error?.status === 401 && !isAuthRequest) {
    if (!refreshPromise) {
      refreshPromise = rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extraOptions)
        .finally(() => { refreshPromise = null })
    }
    const refreshResult = await refreshPromise

    if (refreshResult.data) {
      const { accessToken, user } = refreshResult.data.data ?? refreshResult.data
      api.dispatch(setCredentials({ accessToken, user }))
      result = await rawBaseQuery(args, api, extraOptions)
    } else {
      api.dispatch(clearCredentials())
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Batch', 'Program', 'Order', 'Certificate', 'Company', 'User', 'Payment', 'Admin', 'Invoice', 'Accounting', 'MasterAccounting', 'OrderLog', 'Query'],
  endpoints: () => ({}),
})
