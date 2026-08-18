import { Outlet, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Building2, LogOut } from "lucide-react";
import { logout } from "../features/auth/authSlice";
import { selectCurrentUser } from "../features/auth/authSlice";
import Avatar from "../components/ui/Avatar";
import WorkspaceSwitcher from "../components/WorkspaceSwitcher";

export default function AdminLayout() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between px-6 sticky top-0 z-30">
        <Link to="/admin" className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
          <Building2 size={22} className="text-indigo-600" />
          Admin Console
        </Link>
        <div className="flex items-center gap-3">
          <WorkspaceSwitcher />
          <Avatar name={user?.name} size={32} />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 hidden sm:inline">{user?.name}</span>
          <button
            onClick={() => {
              dispatch(logout());
              navigate("/login");
            }}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
