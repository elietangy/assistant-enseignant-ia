import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAbonnement } from '../context/AbonnementContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { session, chargement } = useAuth()
  const { abonnementActif, chargementAbonnement } = useAbonnement()
  const location = useLocation()

  if (chargement) return <LoadingSpinner />
  if (!session) return <Navigate to="/connexion" replace />
  if (chargementAbonnement) return <LoadingSpinner />
  if (!abonnementActif && location.pathname !== '/abonnement') return <Navigate to="/abonnement" replace />

  return children
}
