import { useEffect, useState } from 'react'
import { enregistrerProfil, obtenirProfil } from '../lib/fichesApi'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ProfilPage() {
  const [nomComplet, setNomComplet] = useState('')
  const [ecole, setEcole] = useState('')
  const [codeParrainage, setCodeParrainage] = useState('')
  const [chargement, setChargement] = useState(true)
  const [enregistrement, setEnregistrement] = useState(false)
  const [messageSucces, setMessageSucces] = useState('')
  const [erreur, setErreur] = useState('')
  const [lienCopie, setLienCopie] = useState(false)

  useEffect(() => {
    obtenirProfil()
      .then((profil) => {
        if (profil) {
          setNomComplet(profil.nom_complet || '')
          setEcole(profil.ecole || '')
          setCodeParrainage(profil.code_parrainage || '')
        }
      })
      .finally(() => setChargement(false))
  }, [])

  const lienParrainage = codeParrainage ? `${window.location.origin}/inscription?ref=${codeParrainage}` : ''

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(lienParrainage)
      setLienCopie(true)
      setTimeout(() => setLienCopie(false), 2000)
    } catch {
      // Copie automatique indisponible : l'utilisateur peut toujours sélectionner le texte à la main.
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErreur('')
    setMessageSucces('')
    setEnregistrement(true)

    try {
      await enregistrerProfil({ nom_complet: nomComplet, ecole })
      setMessageSucces('Profil enregistré. Il apparaîtra sur vos fiches exportées en PDF.')
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnregistrement(false)
    }
  }

  if (chargement) return <LoadingSpinner />

  return (
    <div className="carte">
      <h1 className="page-titre" style={{ marginTop: 0 }}>
        Mon profil
      </h1>
      <p style={{ color: 'var(--couleur-texte-discret)', marginTop: -8 }}>
        Ces informations apparaissent en en-tête de vos fiches exportées en PDF.
      </p>

      {erreur && <div className="message-erreur">{erreur}</div>}
      {messageSucces && <div className="message-info">{messageSucces}</div>}

      <form onSubmit={handleSubmit}>
        <div className="champ">
          <label htmlFor="nomComplet">Nom complet</label>
          <input id="nomComplet" type="text" value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} />
        </div>

        <div className="champ">
          <label htmlFor="ecole">École / établissement</label>
          <input id="ecole" type="text" value={ecole} onChange={(e) => setEcole(e.target.value)} />
        </div>

        <button type="submit" className="bouton" disabled={enregistrement}>
          {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      {codeParrainage && (
        <div className="section" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--couleur-bordure, #ddd)' }}>
          <h2 style={{ marginTop: 0 }}>Parraine un collègue</h2>
          <p style={{ color: 'var(--couleur-texte-discret)' }}>
            Partage ce lien : ton collègue aura <strong>14 jours</strong> d'essai gratuit au lieu de 7, et toi tu
            reçois <strong>30 jours gratuits</strong> dès qu'il prend son premier abonnement.
          </p>
          <div className="champ--ligne" style={{ alignItems: 'flex-end' }}>
            <div className="champ" style={{ flex: 1 }}>
              <input type="text" readOnly value={lienParrainage} onFocus={(e) => e.target.select()} />
            </div>
            <button type="button" className="bouton" onClick={copierLien}>
              {lienCopie ? 'Copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
