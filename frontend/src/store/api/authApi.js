import { baseApi } from './baseApi'

export const authApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    companyLogin: b.mutation({
      query: (body) => ({ url: '/auth/company/login', method: 'POST', body }),
      transformResponse: (r) => r.data,
    }),
    companyRegister: b.mutation({
      query: (body) => ({ url: '/auth/company/register', method: 'POST', body }),
      transformResponse: (r) => r.data,
    }),
    userLogin: b.mutation({
      query: (body) => ({ url: '/auth/user/login', method: 'POST', body }),
      transformResponse: (r) => r.data,
    }),
    userRegister: b.mutation({
      query: (body) => ({ url: '/auth/user/register', method: 'POST', body }),
      transformResponse: (r) => r.data,
    }),
    adminLogin: b.mutation({
      query: (body) => ({ url: '/auth/superadmin/login', method: 'POST', body }),
      transformResponse: (r) => r.data,
    }),
    logout: b.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    forgotPassword: b.mutation({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: b.mutation({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
  }),
})

export const {
  useCompanyLoginMutation, useCompanyRegisterMutation,
  useUserLoginMutation, useUserRegisterMutation,
  useAdminLoginMutation, useLogoutMutation,
  useForgotPasswordMutation, useResetPasswordMutation,
} = authApi
