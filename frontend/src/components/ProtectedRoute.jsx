import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole = null, requireUpload = false }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Redirect to login but save the attempted url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    // User doesn't have required role
    return <Navigate to="/dashboard" replace />
  }

  if (requireUpload && user.role !== 'admin' && !user.can_upload) {
    // User cannot upload
    return <Navigate to="/dashboard" replace />
  }

  return children
}
