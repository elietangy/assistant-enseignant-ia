import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import NouvelleFichePage from './pages/NouvelleFichePage'
import FicheDetailPage from './pages/FicheDetailPage'
import ProfilPage from './pages/ProfilPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="conteneur">
          <Routes>
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/inscription" element={<SignupPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nouvelle-fiche"
              element={
                <ProtectedRoute>
                  <NouvelleFichePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fiche/:id"
              element={
                <ProtectedRoute>
                  <FicheDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profil"
              element={
                <ProtectedRoute>
                  <ProfilPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}
