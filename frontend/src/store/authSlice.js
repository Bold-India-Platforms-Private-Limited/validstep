import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  accessToken: null,
  user: null,
  isLoading: true,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { accessToken, user } = action.payload
      state.accessToken = accessToken
      state.user = { ...user, role: user.role?.toUpperCase() }
      state.isLoading = false
    },
    clearCredentials(state) {
      state.accessToken = null
      state.user = null
      state.isLoading = false
    },
    finishLoading(state) {
      state.isLoading = false
    },
  },
})

export const { setCredentials, clearCredentials, finishLoading } = authSlice.actions

export const selectAccessToken    = (s) => s.auth.accessToken
export const selectUser           = (s) => s.auth.user
export const selectUserRole       = (s) => s.auth.user?.role
export const selectIsAuthenticated= (s) => !!s.auth.accessToken
export const selectIsLoading      = (s) => s.auth.isLoading

export default authSlice.reducer
