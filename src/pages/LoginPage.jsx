import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { connexion } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setEnCours(true)

    const { error } = await connexion(email, motDePasse)

    setEnCours(false)

    if (error) {
      setErreur(
        error.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : error.message
      )
      return
    }

    navigate('/')
  }

  return (
    <div className="carte" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1 className="page-titre" style={{ marginTop: 0 }}>
        Connexion
      </h1>

      {erreur && <div className="message-erreur">{erreur}</div>}

      <form onSubmit={handleSubmit}>
        <div className="champ">
          <label htmlFor="email">Adresse email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="champ">
          <label htmlFor="motDePasse">Mot de passe</label>
          <input
            id="motDePasse"
            type="password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="bouton bouton--pleine-largeur" disabled={enCours}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="lien-auth-alt">
        Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
      </p>
    </div>
  )
}
