import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Home, MessagesSquare, FolderKanban, Camera, CalendarOff, ClipboardList, FileUp, CalendarDays, User, LogOut } from "lucide-react";
import { logout, selectCurrentUser } from "../features/auth/authSlice";
import { selectCurrentWorkspaceId } from "../features/workspace/workspaceUiSlice";
import { usePresence } from "../hooks/usePresence";
import Avatar from "../components/ui/Avatar";
import NdaGate from "../components/NdaGate";
import StatusPicker from "../components/StatusPicker";
import MobileDrawer from "../components/MobileDrawer";

// Mobile bottom nav stays capped at 5 — Leave/Standup are reachable from the desktop
// sidebar and from quick-link cards on Home, so the primary nav doesn't get cramped.
const BOTTOM_NAV_ITEMS = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/groups", label: "Groups", icon: MessagesSquare },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/attendance", label: "Attend", icon: Camera },
  { to: "/app/profile", label: "Profile", icon: User },
];

const SIDEBAR_NAV_ITEMS = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/groups", label: "Groups", icon: MessagesSquare },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/attendance", label: "Attendance", icon: Camera },
  { to: "/app/leave", label: "Leave", icon: CalendarOff },
  { to: "/app/standup", label: "Standup", icon: ClipboardList },
  { to: "/app/submission", label: "Submission", icon: FileUp },
  { to: "/app/calendar", label: "Holidays", icon: CalendarDays },
  { to: "/app/profile", label: "Profile", icon: User },
];

export default function InternLayout() {
  const user = useSelector(selectCurrentUser);
  const currentWorkspaceId = useSelector(selectCurrentWorkspaceId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  usePresence(currentWorkspaceId);

  return (
    <NdaGate workspaceId={currentWorkspaceId}>
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-60 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 h-screen sticky top-0">
        <div className="h-16 flex items-center px-5 font-bold text-neutral-900 dark:text-white">Workspace</div>
        <nav className="flex-1 px-3 space-y-1">
          {SIDEBAR_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          <div className="flex items-center gap-2">
            <Avatar name={user?.name} size={32} />
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate flex-1 min-w-0">{user?.name}</p>
            <button
              onClick={() => {
                dispatch(logout());
                navigate("/login");
              }}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
            >
              <LogOut size={16} />
            </button>
          </div>
          <StatusPicker workspaceId={currentWorkspaceId} size="lg" />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileDrawer items={SIDEBAR_NAV_ITEMS} workspaceId={currentWorkspaceId} />
        <main className="flex-1 pb-20 sm:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t border-neutral-200 dark:border-neutral-800 safe-bottom">
          <div className="grid grid-cols-5">
            {BOTTOM_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium ${
                    isActive ? "text-indigo-600" : "text-neutral-400"
                  }`
                }
              >
                <item.icon size={21} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
    </NdaGate>
  );
}
