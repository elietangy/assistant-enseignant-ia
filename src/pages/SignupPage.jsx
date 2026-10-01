import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { appliquerParrainageEnAttente, memoriserCodeParrainageEnAttente } from '../lib/parrainageApi'

export default function SignupPage() {
  const { inscription } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const codeParrainage = searchParams.get('ref')
  const [nomComplet, setNomComplet] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [messageSucces, setMessageSucces] = useState('')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    if (codeParrainage) memoriserCodeParrainageEnAttente(codeParrainage)
  }, [codeParrainage])

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

    if (!error && data?.session) {
      // Inscription immédiatement connectée (confirmation email désactivée) :
      // on applique le parrainage tout de suite, pas besoin d'attendre le prochain login.
      await appliquerParrainageEnAttente()
    }

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

      {codeParrainage && !messageSucces && (
        <div className="message-info">Tu as été invité(e) par un collègue : ton essai gratuit sera de 14 jours au lieu de 7 !</div>
      )}
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
