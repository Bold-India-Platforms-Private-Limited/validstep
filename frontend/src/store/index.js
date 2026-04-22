import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import { baseApi } from './api/baseApi'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (gDM) => gDM().concat(baseApi.middleware),
})

// Expose store globally so axiosClient interceptor can read the token
if (typeof window !== 'undefined') window.__store = store
