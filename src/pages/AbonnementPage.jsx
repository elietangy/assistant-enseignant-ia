import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { demarrerPaiementAbonnement, TARIFS } from '../lib/abonnementApi'
import { useAbonnement } from '../context/AbonnementContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AbonnementPage() {
  const { abonnement, abonnementActif, chargementAbonnement, rafraichirAbonnement } = useAbonnement()
  const [searchParams] = useSearchParams()
  const [niveauEnCours, setNiveauEnCours] = useState(null)
  const [erreur, setErreur] = useState('')

  const retourPaiement = searchParams.get('paiement') === 'retour'

  useEffect(() => {
    if (!retourPaiement) return

    // Le webhook FedaPay peut mettre quelques secondes à arriver : on revérifie plusieurs fois.
    let tentatives = 0
    const intervalle = setInterval(async () => {
      tentatives += 1
      await rafraichirAbonnement()
      if (tentatives >= 6) clearInterval(intervalle)
    }, 3000)

    return () => clearInterval(intervalle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retourPaiement])

  const handleAbonnement = async (niveau) => {
    setErreur('')
    setNiveauEnCours(niveau)
    try {
      const { url } = await demarrerPaiementAbonnement(niveau)
      window.location.href = url
    } catch (err) {
      setErreur(err.message)
      setNiveauEnCours(null)
    }
  }

  if (chargementAbonnement) return <LoadingSpinner />

  if (abonnementActif) {
    const dateFin = new Date(abonnement.periode_fin).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    return (
      <div className="carte">
        <h1 className="page-titre" style={{ marginTop: 0 }}>
          Mon abonnement
        </h1>
        <div className="message-info">
          Abonnement <strong>{abonnement.niveau}</strong> actif jusqu'au <strong>{dateFin}</strong>.
        </div>
        <p style={{ color: 'var(--couleur-texte-discret)' }}>
          Le renouvellement n'est pas automatique : reviens sur cette page avant le {dateFin} pour reprendre un mois
          supplémentaire.
        </p>
      </div>
    )
  }

  return (
    <div className="carte">
      <h1 className="page-titre" style={{ marginTop: 0 }}>
        Choisis ton abonnement
      </h1>
      <p style={{ color: 'var(--couleur-texte-discret)', marginTop: -8 }}>
        Accède à toutes les fonctionnalités de l'Assistant Enseignant IA (fiches, exercices, évaluations, cahier de
        textes, emploi du temps) avec un abonnement mensuel, sans engagement.
      </p>

      {retourPaiement && (
        <div className="message-info">
          Paiement en cours de confirmation… Cette page se mettra à jour automatiquement dès que c'est validé. Si
          rien ne se passe après une minute, vérifie l'état de ton paiement puis recharge la page.
        </div>
      )}

      {erreur && <div className="message-erreur">{erreur}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 20
        }}
      >
        <OffreCard
          titre="Primaire"
          prix={TARIFS.primaire}
          enCours={niveauEnCours === 'primaire'}
          disabled={!!niveauEnCours}
          onChoisir={() => handleAbonnement('primaire')}
        />
        <OffreCard
          titre="Secondaire"
          prix={TARIFS.secondaire}
          enCours={niveauEnCours === 'secondaire'}
          disabled={!!niveauEnCours}
          onChoisir={() => handleAbonnement('secondaire')}
        />
      </div>
    </div>
  )
}

function OffreCard({ titre, prix, enCours, disabled, onChoisir }) {
  return (
    <div
      style={{
        border: '1px solid var(--couleur-bordure, #ddd)',
        borderRadius: 10,
        padding: 20,
        textAlign: 'center'
      }}
    >
      <h3 style={{ marginTop: 0 }}>{titre}</h3>
      <p style={{ fontSize: '1.6em', fontWeight: 'bold', margin: '8px 0' }}>
        {prix.toLocaleString('fr-FR')} FCFA
        <span style={{ fontSize: '0.5em', fontWeight: 'normal' }}> / mois</span>
      </p>
      <button type="button" className="bouton bouton--pleine-largeur" disabled={disabled} onClick={onChoisir}>
        {enCours ? 'Redirection…' : "S'abonner"}
      </button>
    </div>
  )
}
