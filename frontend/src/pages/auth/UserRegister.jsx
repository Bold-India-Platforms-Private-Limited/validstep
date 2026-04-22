import { Navigate } from 'react-router-dom'
// User registration happens via the batch order page (/order/:slug)
export default function UserRegister() {
  return <Navigate to="/" replace />
}
