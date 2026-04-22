import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectUserRole, selectIsLoading } from '../../store/authSlice'
import { LoadingScreen } from './LoadingScreen'

const LOGIN_PATH = {
  COMPANY: '/auth/company/login',
  SUPERADMIN: '/auth/admin/login',
  USER: '/auth/user/login',
}

export function ProtectedRoute({ children, requiredRole }) {
  const isLoading = useSelector(selectIsLoading)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectUserRole)

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to={LOGIN_PATH[requiredRole] || '/auth/user/login'} replace />
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />

  return children
}
