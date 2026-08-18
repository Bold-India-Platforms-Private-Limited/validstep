import { createSlice } from "@reduxjs/toolkit";

const storedToken = localStorage.getItem("pm_token");
const storedUser = localStorage.getItem("pm_user");

const initialState = {
  token: storedToken || null,
  user: storedUser ? JSON.parse(storedUser) : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      localStorage.setItem("pm_token", token);
      localStorage.setItem("pm_user", JSON.stringify(user));
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem("pm_user", JSON.stringify(state.user));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem("pm_token");
      localStorage.removeItem("pm_user");
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.token;
export const selectIsSuperAdmin = (state) => !!state.auth.user?.isSuperAdmin;
