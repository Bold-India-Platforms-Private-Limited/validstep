import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 30000,
})

// Inject access token from Redux store on every request
axiosClient.interceptors.request.use((config) => {
  try {
    const state = window.__store?.getState()
    const token = state?.auth?.accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch { /* store not ready */ }
  return config
})

// On 401, try a token refresh then retry once
let refreshing = null
axiosClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!refreshing) {
        refreshing = axiosClient.post('/auth/refresh').finally(() => { refreshing = null })
      }
      try {
        const res = await refreshing
        const { accessToken, user } = res.data?.data ?? res.data
        const { store } = await import('../store/index')
        const { setCredentials } = await import('../store/authSlice')
        store.dispatch(setCredentials({ accessToken, user }))
        original.headers.Authorization = `Bearer ${accessToken}`
        return axiosClient(original)
      } catch {
        const { store } = await import('../store/index')
        const { clearCredentials } = await import('../store/authSlice')
        store.dispatch(clearCredentials())
      }
    }
    return Promise.reject(error)
  },
)

export default axiosClient
