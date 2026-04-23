import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { setCredentials, finishLoading, selectIsLoading, selectUserRole, selectIsAuthenticated } from './store/authSlice'
import { LoadingScreen } from './components/shared/LoadingScreen'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { CompanyLayout } from './components/layouts/CompanyLayout'
import { AdminLayout } from './components/layouts/AdminLayout'
import { UserLayout } from './components/layouts/UserLayout'

// Public pages
import Home from './pages/public/Home'
import TermsOfService from './pages/public/TermsOfService'
import PrivacyPolicy from './pages/public/PrivacyPolicy'
import RefundPolicy from './pages/public/RefundPolicy'
import DeliveryPolicy from './pages/public/DeliveryPolicy'
import OrderCertificate from './pages/public/OrderCertificate'
import VerifyCertificate from './pages/public/VerifyCertificate'
import PaymentSuccess from './pages/public/PaymentSuccess'
import PaymentFailure from './pages/public/PaymentFailure'
import NotFound from './pages/public/NotFound'
import About from './pages/public/About'
import Contact from './pages/public/Contact'

// Auth pages
import CompanyLogin from './pages/auth/CompanyLogin'
import CompanyRegister from './pages/auth/CompanyRegister'
import UserLogin from './pages/auth/UserLogin'
import UserRegister from './pages/auth/UserRegister'
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
import AdminCompanies from './pages/admin/Companies'
import AdminCompanyDetail from './pages/admin/CompanyDetail'
import AdminBatches from './pages/admin/Batches'
import AdminOrders from './pages/admin/Orders'
import AdminPricing from './pages/admin/Pricing'
import AdminPayments from './pages/admin/Payments'
import AdminBatchDetail from './pages/admin/BatchDetail'
import AdminInvoices from './pages/admin/Invoices'

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
  const location = useLocation()
  const hasAttemptedSessionRestore = useRef(false)

  // Restore session in the background — does NOT block public page rendering.
  // Skip backend calls on landing page for a faster, static-first experience.
  useEffect(() => {
    if (location.pathname === '/') {
      dispatch(finishLoading())
      return
    }

    if (hasAttemptedSessionRestore.current) return
    hasAttemptedSessionRestore.current = true

    let cancelled = false
    const restoreSession = async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        )
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
  }, [dispatch, location.pathname])

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
      <Route path="/order/:slug" element={<OrderCertificate />} />
      <Route path="/verify/:hash" element={<VerifyCertificate />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/failure" element={<PaymentFailure />} />

      {/* Auth */}
      <Route path="/auth/company/login" element={<CompanyLogin />} />
      <Route path="/auth/company/register" element={<CompanyRegister />} />
      <Route path="/auth/user/login" element={<UserLogin />} />
      <Route path="/auth/user/register" element={<UserRegister />} />
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
                <Route path="companies" element={<AdminCompanies />} />
                <Route path="companies/:id" element={<AdminCompanyDetail />} />
                <Route path="batches" element={<AdminBatches />} />
                <Route path="orders" element={<AdminOrders />} />
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

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
