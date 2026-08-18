import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetMyWorkspacesQuery } from "../api/apiSlice";
import { setCurrentWorkspace, selectCurrentWorkspaceId } from "../features/workspace/workspaceUiSlice";

// Interns typically belong to exactly one batch/workspace — auto-select it.
// If they belong to several, the first one is used until a picker is built.
export function useMyWorkspace() {
  const dispatch = useDispatch();
  const { data, isLoading } = useGetMyWorkspacesQuery();
  const currentWorkspaceId = useSelector(selectCurrentWorkspaceId);

  useEffect(() => {
    if (!data?.data?.length) return;
    const stillValid = data.data.some((w) => w.id === currentWorkspaceId);
    if (!currentWorkspaceId || !stillValid) {
      const first = data.data[0];
      dispatch(setCurrentWorkspace({ id: first.id, role: first.role }));
    }
  }, [data, currentWorkspaceId, dispatch]);

  const workspace = data?.data?.find((w) => w.id === currentWorkspaceId) || data?.data?.[0] || null;

  return { workspaces: data?.data || [], workspace, isLoading };
}
