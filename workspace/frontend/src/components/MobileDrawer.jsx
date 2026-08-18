import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Menu, X, LogOut } from "lucide-react";
import { logout, selectCurrentUser } from "../features/auth/authSlice";
import Avatar from "./ui/Avatar";
import StatusPicker from "./StatusPicker";

// Native-app-style pattern: bottom tab bar covers the primary 5 destinations, this
// hamburger drawer covers everything else (Leave, Standup, Submission, Calendar…)
// without cramming a 9-item bottom bar.
export default function MobileDrawer({ items, workspaceId }) {
  const [open, setOpen] = useState(false);
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <>
      <header className="sm:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 safe-top">
        <button onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-lg text-neutral-600 dark:text-neutral-300">
          <Menu size={22} />
        </button>
        <span className="font-bold text-neutral-900 dark:text-white">Workspace</span>
        <Avatar name={user?.name} size={28} />
      </header>

      {open && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-neutral-900 shadow-xl flex flex-col animate-fade-in">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 safe-top space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar name={user?.name} size={40} />
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{user?.name}</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 text-neutral-400">
                  <X size={18} />
                </button>
              </div>
              <StatusPicker workspaceId={workspaceId} size="lg" />
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
                        : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 safe-bottom">
              <button
                onClick={() => {
                  dispatch(logout());
                  navigate("/login");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut size={18} /> Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
