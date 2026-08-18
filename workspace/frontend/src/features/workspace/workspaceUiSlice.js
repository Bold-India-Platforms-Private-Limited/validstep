import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentWorkspaceId: localStorage.getItem("pm_current_workspace") || null,
  currentRole: localStorage.getItem("pm_current_role") || null, // "ADMIN" | "MEMBER"
};

const workspaceUiSlice = createSlice({
  name: "workspaceUi",
  initialState,
  reducers: {
    setCurrentWorkspace(state, action) {
      const { id, role } = action.payload;
      state.currentWorkspaceId = id;
      state.currentRole = role;
      localStorage.setItem("pm_current_workspace", id);
      localStorage.setItem("pm_current_role", role);
    },
    clearCurrentWorkspace(state) {
      state.currentWorkspaceId = null;
      state.currentRole = null;
      localStorage.removeItem("pm_current_workspace");
      localStorage.removeItem("pm_current_role");
    },
  },
});

export const { setCurrentWorkspace, clearCurrentWorkspace } = workspaceUiSlice.actions;
export default workspaceUiSlice.reducer;

export const selectCurrentWorkspaceId = (state) => state.workspaceUi.currentWorkspaceId;
export const selectCurrentWorkspaceRole = (state) => state.workspaceUi.currentRole;
export const selectIsWorkspaceAdmin = (state) => state.workspaceUi.currentRole === "ADMIN";
