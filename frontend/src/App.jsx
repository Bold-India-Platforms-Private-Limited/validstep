import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { setCredentials, finishLoading, selectIsLoading, selectUserRole, selectIsAuthenticated } from './store/authSlice'
import { LoadingScreen } from './components/shared/LoadingScreen'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { CompanyLayout } from './components/layouts/CompanyLayout'
import { AdminLayout } from './components/layouts/AdminLayout'
import { MasterAccountingLayout } from './components/layouts/MasterAccountingLayout'
import { UserLayout } from './components/layouts/UserLayout'

// Public pages
import Home from './pages/public/Home'
import TermsOfService from './pages/public/TermsOfService'
import PrivacyPolicy from './pages/public/PrivacyPolicy'
import RefundPolicy from './pages/public/RefundPolicy'
import DeliveryPolicy from './pages/public/DeliveryPolicy'
import VerifyCertificate from './pages/public/VerifyCertificate'
import NotFound from './pages/public/NotFound'
import About from './pages/public/About'
import Contact from './pages/public/Contact'

// Auth pages
import CompanyLogin from './pages/auth/CompanyLogin'
import CompanyRegister from './pages/auth/CompanyRegister'
import UserLogin from './pages/auth/UserLogin'
import AdminLogin from './pages/auth/AdminLogin'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Company pages
import CompanyDashboard from './pages/company/Dashboard'
import Programs from './pages/company/Programs'
import Batches from './pages/company/Batches'
import BatchCreate from './pages/company/BatchCreate'
import BatchDetail from './pages/company/BatchDetail'
import CompanyProfile from './pages/company/Profile'
import CompanyPayments from './pages/company/Payments'

// User pages
import UserDashboard from './pages/user/Dashboard'
import CertificateView from './pages/user/CertificateView'
import UserInvoices from './pages/user/Invoices'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminAnalytics from './pages/admin/Analytics'
import AdminCompanies from './pages/admin/Companies'
import AdminCompanyDetail from './pages/admin/CompanyDetail'
import AdminBatches from './pages/admin/Batches'
import AdminPricing from './pages/admin/Pricing'
import AdminPayments from './pages/admin/Payments'
import AdminBatchDetail from './pages/admin/BatchDetail'
import AdminInvoices from './pages/admin/Invoices'
import AdminUsers from './pages/admin/Users'
import AdminOrderLog from './pages/admin/OrderLog'

// Master Accounting pages
import MasterAccountingDashboard from './pages/admin/master-accounting/Dashboard'
import MasterAccountingBankLedger from './pages/admin/master-accounting/BankLedger'
import MasterAccountingInvoices from './pages/admin/master-accounting/Invoices'
import MasterAccountingSalesRegister from './pages/admin/master-accounting/SalesRegister'
import MasterAccountingCategoriesRules from './pages/admin/master-accounting/CategoriesRules'
import MasterAccountingImports from './pages/admin/master-accounting/Imports'
import MasterAccountingFileArchive from './pages/admin/master-accounting/FileArchive'
import MasterAccountingFileCompare from './pages/admin/master-accounting/FileCompare'

// Company pages (invoices)
import CompanyInvoices from './pages/company/Invoices'

function RootRedirect() {
  const isLoading = useSelector(selectIsLoading)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectUserRole)

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Home />

  const dashboardPath =
    role === 'COMPANY' ? '/company/dashboard'
    : role === 'SUPERADMIN' ? '/admin/dashboard'
    : '/dashboard'

  return <Navigate to={dashboardPath} replace />
}

export default function App() {
  const dispatch = useDispatch()

  // Restore session once at true app startup (does NOT block public page rendering) —
  // reads location.pathname directly rather than depending on it, so this never re-runs
  // on client-side navigation. Deliberately has no "already ran" ref guard: React 18
  // StrictMode intentionally double-invokes effects in dev (mount → cleanup → mount) to
  // surface exactly this class of bug. An earlier version added a ref that persisted
  // across that double-invocation and returned early on the second (real) invocation,
  // while the *first* invocation's cleanup had already set `cancelled = true` on the
  // still-in-flight request — so its dispatch was silently skipped and the app was stuck
  // on the loading screen forever after any hard refresh of an authenticated page. Firing
  // /auth/refresh twice in that dev-only scenario is harmless (verified against
  // auth.controller.js — refreshToken doesn't rotate or invalidate the cookie, it's a
  // pure read-and-reissue), and StrictMode's double-invoke doesn't happen in production
  // builds at all.
  useEffect(() => {
    if (window.location.pathname === '/') {
      dispatch(finishLoading())
      return
    }

    let cancelled = false
    const callRefresh = () => axios.post(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    const restoreSession = async () => {
      try {
        let response
        try {
          response = await callRefresh()
        } catch (err) {
          // A 401 means the refresh token itself is invalid/expired — genuinely logged out,
          // no point retrying. Anything else (a 500, a network blip, a mid-deploy restart)
          // is transient — one retry after a short delay keeps a brief server hiccup from
          // silently logging out every admin on their next page refresh.
          if (err.response?.status === 401 || cancelled) throw err
          await new Promise((r) => setTimeout(r, 1200))
          if (cancelled) return
          response = await callRefresh()
        }
        if (cancelled) return
        const data = response.data?.data ?? response.data
        const { accessToken, user } = data
        if (accessToken && user) {
          const normalizedUser = { ...user, role: user.role?.toUpperCase() }
          dispatch(setCredentials({ accessToken, user: normalizedUser }))
        } else {
          dispatch(finishLoading())
        }
      } catch {
        if (!cancelled) dispatch(finishLoading())
      }
    }
    restoreSession()
    return () => { cancelled = true }
  }, [dispatch])

  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Policy pages */}
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="/delivery" element={<DeliveryPolicy />} />

      {/* Company info */}
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />

      {/* Public */}
      <Route path="/verify/:hash" element={<VerifyCertificate />} />

      {/* Auth */}
      <Route path="/auth/company/login" element={<CompanyLogin />} />
      <Route path="/auth/company/register" element={<CompanyRegister />} />
      <Route path="/auth/user/login" element={<UserLogin />} />
      <Route path="/auth/admin/login" element={<AdminLogin />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      {/* Legacy redirect */}
      <Route path="/auth/login" element={<Navigate to="/auth/user/login" replace />} />

      {/* Company routes */}
      <Route
        path="/company/*"
        element={
          <ProtectedRoute requiredRole="COMPANY">
            <CompanyLayout>
              <Routes>
                <Route path="dashboard" element={<CompanyDashboard />} />
                <Route path="programs" element={<Programs />} />
                <Route path="batches" element={<Batches />} />
                <Route path="batches/create" element={<BatchCreate />} />
                <Route path="batches/:id" element={<BatchDetail />} />
                <Route path="profile" element={<CompanyProfile />} />
                <Route path="payments" element={<CompanyPayments />} />
                <Route path="invoices" element={<CompanyInvoices />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </CompanyLayout>
          </ProtectedRoute>
        }
      />

      {/* User routes */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute requiredRole="USER">
            <UserLayout>
              <Routes>
                <Route path="" element={<UserDashboard />} />
                <Route path="certificates/:id" element={<CertificateView />} />
                <Route path="invoices" element={<UserInvoices />} />
                <Route path="*" element={<Navigate to="" replace />} />
              </Routes>
            </UserLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="SUPERADMIN">
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="companies" element={<AdminCompanies />} />
                <Route path="companies/:id" element={<AdminCompanyDetail />} />
                <Route path="batches" element={<AdminBatches />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="order-log" element={<AdminOrderLog />} />
                <Route path="pricing" element={<AdminPricing />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="batches/:id" element={<AdminBatchDetail />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Master Accounting (separate gated panel, still requires superadmin login) */}
      <Route
        path="/admin/master-accounting/*"
        element={
          <ProtectedRoute requiredRole="SUPERADMIN">
            <MasterAccountingLayout>
              <Routes>
                <Route path="dashboard" element={<MasterAccountingDashboard />} />
                <Route path="bank-ledger" element={<MasterAccountingBankLedger />} />
                <Route path="invoices" element={<MasterAccountingInvoices />} />
                <Route path="sales-register" element={<MasterAccountingSalesRegister />} />
                <Route path="categories-rules" element={<MasterAccountingCategoriesRules />} />
                <Route path="imports" element={<MasterAccountingImports />} />
                <Route path="files" element={<MasterAccountingFileArchive />} />
                <Route path="files/:id/compare" element={<MasterAccountingFileCompare />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </MasterAccountingLayout>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
