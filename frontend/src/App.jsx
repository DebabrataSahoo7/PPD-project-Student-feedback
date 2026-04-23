import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore.js';
import { LayoutProvider } from './components/layout/LayoutContext.jsx';
import AppShell from './components/layout/AppShell.jsx';

// Auth / Public
import LoginPage          from './pages/LoginPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import NotificationsPage  from './pages/NotificationsPage.jsx';

// Admin
import AdminHome               from './pages/admin/AdminHome.jsx';
import FormsListPage           from './pages/admin/FormsListPage.jsx';
import FormDetailPage          from './pages/admin/FormDetailPage.jsx';
import FormBuilderPage         from './pages/admin/FormBuilderPage.jsx';
import AnalyticsPage           from './pages/admin/AnalyticsPage.jsx';
import SettingsPage            from './pages/admin/SettingsPage.jsx';
import ProgrammesPage          from './pages/admin/ProgrammesPage.jsx';
import BranchesPage            from './pages/admin/BranchesPage.jsx';
import AcademicWorkspacePage   from './pages/admin/AcademicWorkspacePage.jsx';
import UsersPage               from './pages/admin/UsersPage.jsx';
import UserImportPage          from './pages/admin/UserImportPage.jsx';
import StudentImportPage       from './pages/admin/StudentImportPage.jsx';

// Faculty
import FacultyDashboard     from './pages/faculty/FacultyDashboard.jsx';
import FacultyFormsPage     from './pages/faculty/FacultyFormsPage.jsx';
import FacultyHistoryPage   from './pages/faculty/FacultyHistoryPage.jsx';
import FacultyAnalyticsPage from './pages/faculty/FacultyAnalyticsPage.jsx';
import FacultyProfile       from './pages/faculty/FacultyProfile.jsx';

// Student
import StudentHome       from './pages/student/StudentHome.jsx';
import StudentProfile    from './pages/student/StudentProfile.jsx';
import FormFillPage      from './pages/student/FormFillPage.jsx';
import SubmissionSuccess from './pages/student/SubmissionSuccess.jsx';

// ── Guards ────────────────────────────────────────────────────
function RequireAuth({ children, role }) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    // Store the intended URL so login can redirect back
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (role && user.role !== role) {
    if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
    if (user.role === 'student') return <Navigate to="/student" replace />;
    return <Navigate to="/admin" replace />;
  }
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return children;
}

function RequireAdminOrFaculty({ children }) {
  const { user, token } = useAuthStore();
  const location = useLocation();
  if (!token || !user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.role !== 'admin' && user.role !== 'faculty') return <Navigate to="/student" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return children;
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <LayoutProvider>
      <Routes>
        {/* ── Public / standalone (no AppShell) ── */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/f/:shareToken"         element={<FormFillPage />} />
        <Route path="/f/:shareToken/success" element={<SubmissionSuccess />} />

        {/* Form builder has its own full-screen custom header — outside AppShell */}
        <Route path="/admin/forms/:id/builder"
          element={<RequireAuth role="admin"><FormBuilderPage /></RequireAuth>} />

        {/* ── Persistent shell — TopBar/BottomNav never remount ── */}
        <Route element={<AppShell />}>
          {/* Shared */}
          <Route path="/notifications"
            element={<RequireAdminOrFaculty><NotificationsPage /></RequireAdminOrFaculty>} />

          {/* ── Admin ── */}
          <Route path="/admin"
            element={<RequireAuth role="admin"><AdminHome /></RequireAuth>} />
          <Route path="/admin/forms"
            element={<RequireAuth role="admin"><FormsListPage /></RequireAuth>} />
          <Route path="/admin/forms/:id"
            element={<RequireAuth role="admin"><FormDetailPage /></RequireAuth>} />
          <Route path="/admin/forms/:id/analytics"
            element={<RequireAuth role="admin"><AnalyticsPage /></RequireAuth>} />
          <Route path="/admin/analytics"
            element={<RequireAuth role="admin"><FormsListPage /></RequireAuth>} />
          <Route path="/admin/settings"
            element={<RequireAuth role="admin"><SettingsPage /></RequireAuth>} />
          <Route path="/admin/settings/academic-workspace"
            element={<RequireAuth role="admin"><AcademicWorkspacePage /></RequireAuth>} />
          <Route path="/admin/settings/programmes"
            element={<RequireAuth role="admin"><ProgrammesPage /></RequireAuth>} />
          <Route path="/admin/settings/branches/:programmeId"
            element={<RequireAuth role="admin"><BranchesPage /></RequireAuth>} />
          <Route path="/admin/settings/users"
            element={<RequireAuth role="admin"><UsersPage /></RequireAuth>} />
          <Route path="/admin/settings/users/import"
            element={<RequireAuth role="admin"><UserImportPage /></RequireAuth>} />
          <Route path="/admin/settings/students/import"
            element={<RequireAuth role="admin"><StudentImportPage /></RequireAuth>} />

          {/* ── Faculty ── */}
          <Route path="/faculty"
            element={<RequireAuth role="faculty"><FacultyDashboard /></RequireAuth>} />
          <Route path="/faculty/forms"
            element={<RequireAuth role="faculty"><FacultyFormsPage /></RequireAuth>} />
          <Route path="/faculty/history"
            element={<RequireAuth role="faculty"><FacultyHistoryPage /></RequireAuth>} />
          <Route path="/faculty/analytics"
            element={<RequireAuth role="faculty"><FacultyAnalyticsPage /></RequireAuth>} />
          <Route path="/faculty/profile"
            element={<RequireAuth role="faculty"><FacultyProfile /></RequireAuth>} />

          {/* ── Student ── */}
          <Route path="/student"
            element={<RequireAuth role="student"><StudentHome /></RequireAuth>} />
          <Route path="/student/profile"
            element={<RequireAuth role="student"><StudentProfile /></RequireAuth>} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={
          user?.role === 'faculty' ? <Navigate to="/faculty" replace /> :
          user?.role === 'admin'   ? <Navigate to="/admin"   replace /> :
          user?.role === 'student' ? <Navigate to="/student" replace /> :
                                     <Navigate to="/login"   replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LayoutProvider>
  );
}
