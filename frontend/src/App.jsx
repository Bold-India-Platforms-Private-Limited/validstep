import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

// Auth pages
import CompanyLogin from './pages/auth/CompanyLogin'
import CompanyRegister from './pages/auth/CompanyRegister'
import UserLogin from './pages/auth/UserLogin'
import UserRegister from './pages/auth/UserRegister'
import AdminLogin from './pages/auth/AdminLogin'

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

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminCompanies from './pages/admin/Companies'
import AdminCompanyDetail from './pages/admin/CompanyDetail'
import AdminBatches from './pages/admin/Batches'
import AdminOrders from './pages/admin/Orders'
import AdminPricing from './pages/admin/Pricing'
import AdminPayments from './pages/admin/Payments'
import AdminBatchDetail from './pages/admin/BatchDetail'

// Always show Home — logged-in users can navigate to dashboard via the navbar
function RootRedirect() {
  const isLoading = useSelector(selectIsLoading)
  if (isLoading) return <LoadingScreen />
  return <Home />
}

export default function App() {
  const dispatch = useDispatch()
  const isLoading = useSelector(selectIsLoading)

  // On mount: try to restore session via refresh token cookie.
  // Use plain axios (not axiosClient) to avoid the 401 interceptor looping.
  useEffect(() => {
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
          // Normalize role to uppercase to match frontend role checks (COMPANY, USER, SUPERADMIN)
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

  if (isLoading) return <LoadingScreen />

  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Policy pages */}
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="/delivery" element={<DeliveryPolicy />} />

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
