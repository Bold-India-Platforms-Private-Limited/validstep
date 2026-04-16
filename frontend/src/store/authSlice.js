import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { accessToken, user } = action.payload
      state.accessToken = accessToken
      state.user = user
      state.isAuthenticated = true
      state.isLoading = false
    },
    updateAccessToken: (state, action) => {
      state.accessToken = action.payload
    },
    logout: (state) => {
      state.accessToken = null
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    finishLoading: (state) => {
      state.isLoading = false
    },
  },
})

export const { setCredentials, updateAccessToken, logout, setLoading, finishLoading } = authSlice.actions

export const selectCurrentUser = (state) => state.auth.user
export const selectAccessToken = (state) => state.auth.accessToken
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectIsLoading = (state) => state.auth.isLoading
export const selectUserRole = (state) => state.auth.user?.role

export default authSlice.reducer
