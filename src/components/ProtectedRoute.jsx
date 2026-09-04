import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { session, chargement } = useAuth()

  if (chargement) return <LoadingSpinner />
  if (!session) return <Navigate to="/connexion" replace />

  return children
}
