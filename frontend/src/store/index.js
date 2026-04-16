import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import { authApi } from './api/authApi'
import { companyApi } from './api/companyApi'
import { userApi } from './api/userApi'
import { adminApi } from './api/adminApi'
import { paymentApi } from './api/paymentApi'
import { publicApi } from './api/publicApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [companyApi.reducerPath]: companyApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [publicApi.reducerPath]: publicApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      companyApi.middleware,
      userApi.middleware,
      adminApi.middleware,
      paymentApi.middleware,
      publicApi.middleware,
    ),
})

export default store
