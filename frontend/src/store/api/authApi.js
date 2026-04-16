import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Normalize any login/register response into { accessToken, user }
function normalizeAuthResponse(response, role) {
  const d = response?.data ?? response
  const accessToken = d.accessToken
  let entity = d.company ?? d.user ?? d.admin ?? {}
  const user = {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    role,
  }
  return { accessToken, user }
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.accessToken
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  endpoints: (builder) => ({
    companyLogin: builder.mutation({
      query: (credentials) => ({ url: '/auth/company/login', method: 'POST', body: credentials }),
      transformResponse: (res) => normalizeAuthResponse(res, 'COMPANY'),
    }),
    companyRegister: builder.mutation({
      query: (data) => ({ url: '/auth/company/register', method: 'POST', body: data }),
      transformResponse: (res) => normalizeAuthResponse(res, 'COMPANY'),
    }),
    userLogin: builder.mutation({
      query: (credentials) => ({ url: '/auth/user/login', method: 'POST', body: credentials }),
      transformResponse: (res) => normalizeAuthResponse(res, 'USER'),
    }),
    userRegister: builder.mutation({
      query: (data) => ({ url: '/auth/user/register', method: 'POST', body: data }),
      transformResponse: (res) => {
        const d = res?.data ?? res
        return {
          accessToken: d.accessToken,
          user: { id: d.user?.id, name: d.user?.name, email: d.user?.email, role: 'USER' },
          batch: d.batch,
        }
      },
    }),
    adminLogin: builder.mutation({
      query: (credentials) => ({ url: '/auth/superadmin/login', method: 'POST', body: credentials }),
      transformResponse: (res) => normalizeAuthResponse(res, 'SUPERADMIN'),
    }),
    refreshToken: builder.mutation({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
      transformResponse: (res) => res?.data ?? res,
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
  }),
})

export const {
  useCompanyLoginMutation,
  useCompanyRegisterMutation,
  useUserLoginMutation,
  useUserRegisterMutation,
  useAdminLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
} = authApi
