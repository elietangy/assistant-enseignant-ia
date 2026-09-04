import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
  const { inscription } = useAuth()
  const navigate = useNavigate()
  const [nomComplet, setNomComplet] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [messageSucces, setMessageSucces] = useState('')
  const [enCours, setEnCours] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setMessageSucces('')

    if (motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setEnCours(true)
    const { data, error } = await inscription(email, motDePasse, nomComplet)
    setEnCours(false)

    if (error) {
      setErreur(error.message)
      return
    }

    if (data?.session) {
      navigate('/')
      return
    }

    setMessageSucces('Compte créé ! Vérifiez votre boîte email pour confirmer votre adresse, puis connectez-vous.')
  }

  return (
    <div className="carte" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1 className="page-titre" style={{ marginTop: 0 }}>
        Créer un compte
      </h1>

      {erreur && <div className="message-erreur">{erreur}</div>}
      {messageSucces && <div className="message-info">{messageSucces}</div>}

      {!messageSucces && (
        <form onSubmit={handleSubmit}>
          <div className="champ">
            <label htmlFor="nomComplet">Nom complet</label>
            <input
              id="nomComplet"
              type="text"
              required
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              autoComplete="name"
            />
          </div>

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
              minLength={6}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="bouton bouton--pleine-largeur" disabled={enCours}>
            {enCours ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
      )}

      <p className="lien-auth-alt">
        Déjà un compte ? <Link to="/connexion">Se connecter</Link>
      </p>
    </div>
  )
}
