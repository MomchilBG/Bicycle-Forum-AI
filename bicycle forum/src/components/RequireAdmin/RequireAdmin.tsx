import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

const RequireAdmin = () => {
  const { session, profile, loading } = useAuth()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  // profile is fetched in a separate effect keyed off the session, so on a
  // fresh page load `loading` can already be false while it's still in
  // flight - wait for it rather than reading that gap as "not an admin".
  if (!profile) return null
  if (profile.role !== 'admin') return <Navigate to="/" replace />

  return <Outlet />
}

export default RequireAdmin
