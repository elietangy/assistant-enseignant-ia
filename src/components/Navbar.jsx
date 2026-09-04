import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { session, deconnexion } = useAuth()
  const navigate = useNavigate()

  const handleDeconnexion = async () => {
    await deconnexion()
    navigate('/connexion')
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar__logo">
        Assistant Enseignant IA
      </Link>
      {session && (
        <nav className="navbar__liens">
          <Link to="/">Bibliothèque</Link>
          <Link to="/nouvelle-fiche">Nouvelle fiche</Link>
          <Link to="/profil">Mon profil</Link>
          <button onClick={handleDeconnexion} className="bouton bouton--discret">
            Déconnexion
          </button>
        </nav>
      )}
    </header>
  )
}
