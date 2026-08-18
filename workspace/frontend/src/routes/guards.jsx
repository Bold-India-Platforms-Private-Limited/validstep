import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentToken, selectCurrentUser } from "../features/auth/authSlice";

export function RequireAuth() {
  const token = useSelector(selectCurrentToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireSuperAdmin() {
  const user = useSelector(selectCurrentUser);
  if (!user?.isSuperAdmin) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export function RedirectByRole() {
  const user = useSelector(selectCurrentUser);
  if (user?.isSuperAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/app" replace />;
}
