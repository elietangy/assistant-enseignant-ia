import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LIENS = [
  { to: '/fiches', label: 'Fiches de cours' },
  { to: '/exercices', label: 'Exercices' },
  { to: '/evaluations', label: 'Évaluations' },
  { to: '/cahier-texte', label: 'Cahier de textes' },
  { to: '/emploi-du-temps', label: 'Emploi du temps' },
  { to: '/profil', label: 'Mon profil' }
]

export default function Navbar() {
  const { session, deconnexion } = useAuth()
  const navigate = useNavigate()
  const [menuOuvert, setMenuOuvert] = useState(false)

  const handleDeconnexion = async () => {
    setMenuOuvert(false)
    await deconnexion()
    navigate('/connexion')
  }

  const fermerMenu = () => setMenuOuvert(false)

  return (
    <header className="navbar">
      <div className="navbar__ligne">
        <Link to="/" className="navbar__logo" onClick={fermerMenu}>
          Assistant Enseignant IA
        </Link>
        {session && (
          <button
            className="navbar__burger"
            onClick={() => setMenuOuvert((o) => !o)}
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
        )}
      </div>
      {session && (
        <nav className={`navbar__liens ${menuOuvert ? 'navbar__liens--ouvert' : ''}`}>
          {LIENS.map((lien) => (
            <Link key={lien.to} to={lien.to} onClick={fermerMenu}>
              {lien.label}
            </Link>
          ))}
          <button onClick={handleDeconnexion} className="bouton bouton--discret">
            Déconnexion
          </button>
        </nav>
      )}
    </header>
  )
}
