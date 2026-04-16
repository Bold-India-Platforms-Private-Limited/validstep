import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { selectIsAuthenticated, selectIsLoading, selectUserRole } from '../../store/authSlice'
import { LoadingScreen } from './LoadingScreen'

export function ProtectedRoute({ children, requiredRole }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading = useSelector(selectIsLoading)
  const role = useSelector(selectUserRole)
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    // Redirect to the appropriate login page
    let loginPath = '/auth/login'
    if (requiredRole === 'COMPANY') loginPath = '/auth/company/login'
    else if (requiredRole === 'SUPERADMIN') loginPath = '/auth/admin/login'
    else if (requiredRole === 'USER') loginPath = '/auth/user/login'

    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (requiredRole && role !== requiredRole) {
    // Redirect to the user's own dashboard
    let dashPath = '/'
    if (role === 'COMPANY') dashPath = '/company/dashboard'
    else if (role === 'SUPERADMIN') dashPath = '/admin/dashboard'
    else if (role === 'USER') dashPath = '/dashboard'
    return <Navigate to={dashPath} replace />
  }

  return children
}
