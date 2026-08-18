import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth, RequireSuperAdmin, RedirectByRole } from "./routes/guards";

import Login from "./pages/Login";

import AdminLayout from "./layouts/AdminLayout";
import AdminWorkspaceShell from "./layouts/AdminWorkspaceShell";
import CompaniesPage from "./pages/admin/CompaniesPage";
import CompanyWorkspacesPage from "./pages/admin/CompanyWorkspacesPage";
import WorkspaceOverviewPage from "./pages/admin/WorkspaceOverviewPage";
import TeamGroupsPage from "./pages/admin/TeamGroupsPage";
import AdminGroupChatPage from "./pages/admin/GroupChatPage";
import ProjectsPage from "./pages/admin/ProjectsPage";
import AdminProjectDetailPage from "./pages/admin/ProjectDetailPage";
import AdminAttendancePage from "./pages/admin/AttendancePage";
import AdminLeavePage from "./pages/admin/LeavePage";
import AdminStandupPage from "./pages/admin/StandupPage";
import AnnouncementsPage from "./pages/admin/AnnouncementsPage";
import QueriesPage from "./pages/admin/QueriesPage";
import SubmissionsPage from "./pages/admin/SubmissionsPage";
import SettingsPage from "./pages/admin/SettingsPage";

import InternLayout from "./layouts/InternLayout";
import HomePage from "./pages/intern/HomePage";
import GroupsListPage from "./pages/intern/GroupsListPage";
import InternGroupChatPage from "./pages/intern/GroupChatPage";
import ProjectsListPage from "./pages/intern/ProjectsListPage";
import InternProjectDetailPage from "./pages/intern/ProjectDetailPage";
import InternAttendancePage from "./pages/intern/AttendancePage";
import InternLeavePage from "./pages/intern/LeavePage";
import InternStandupPage from "./pages/intern/StandupPage";
import SubmissionPage from "./pages/intern/SubmissionPage";
import InternCalendarPage from "./pages/intern/CalendarPage";
import ProfilePage from "./pages/intern/ProfilePage";
import TermsPage from "./pages/TermsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<TermsPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<RedirectByRole />} />

        <Route element={<RequireSuperAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<CompaniesPage />} />
            <Route path="companies/:companyId" element={<CompanyWorkspacesPage />} />
            <Route path="w/:workspaceId/groups/:groupId" element={<AdminGroupChatPage />} />
            <Route path="w/:workspaceId" element={<AdminWorkspaceShell />}>
              <Route index element={<WorkspaceOverviewPage />} />
              <Route path="team" element={<TeamGroupsPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<AdminProjectDetailPage />} />
              <Route path="attendance" element={<AdminAttendancePage />} />
              <Route path="leave" element={<AdminLeavePage />} />
              <Route path="standup" element={<AdminStandupPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="queries" element={<QueriesPage />} />
              <Route path="submissions" element={<SubmissionsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/app" element={<InternLayout />}>
          <Route index element={<HomePage />} />
          <Route path="groups" element={<GroupsListPage />} />
          <Route path="groups/:groupId" element={<InternGroupChatPage />} />
          <Route path="projects" element={<ProjectsListPage />} />
          <Route path="projects/:projectId" element={<InternProjectDetailPage />} />
          <Route path="attendance" element={<InternAttendancePage />} />
          <Route path="leave" element={<InternLeavePage />} />
          <Route path="standup" element={<InternStandupPage />} />
          <Route path="submission" element={<SubmissionPage />} />
          <Route path="calendar" element={<InternCalendarPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
