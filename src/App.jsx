import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import NouvelleFichePage from './pages/NouvelleFichePage'
import FicheDetailPage from './pages/FicheDetailPage'
import ExercicesDashboardPage from './pages/ExercicesDashboardPage'
import NouvelExercicePage from './pages/NouvelExercicePage'
import ExerciceDetailPage from './pages/ExerciceDetailPage'
import EvaluationsDashboardPage from './pages/EvaluationsDashboardPage'
import NouvelleEvaluationPage from './pages/NouvelleEvaluationPage'
import EvaluationDetailPage from './pages/EvaluationDetailPage'
import CahierTextePage from './pages/CahierTextePage'
import EmploiDuTempsPage from './pages/EmploiDuTempsPage'
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
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fiches"
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
              path="/exercices"
              element={
                <ProtectedRoute>
                  <ExercicesDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercices/nouveau"
              element={
                <ProtectedRoute>
                  <NouvelExercicePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercices/:id"
              element={
                <ProtectedRoute>
                  <ExerciceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluations"
              element={
                <ProtectedRoute>
                  <EvaluationsDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluations/nouvelle"
              element={
                <ProtectedRoute>
                  <NouvelleEvaluationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluations/:id"
              element={
                <ProtectedRoute>
                  <EvaluationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cahier-texte"
              element={
                <ProtectedRoute>
                  <CahierTextePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emploi-du-temps"
              element={
                <ProtectedRoute>
                  <EmploiDuTempsPage />
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
