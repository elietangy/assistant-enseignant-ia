import { useEffect, useState } from 'react'
import { enregistrerProfil, obtenirProfil } from '../lib/fichesApi'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ProfilPage() {
  const [nomComplet, setNomComplet] = useState('')
  const [ecole, setEcole] = useState('')
  const [chargement, setChargement] = useState(true)
  const [enregistrement, setEnregistrement] = useState(false)
  const [messageSucces, setMessageSucces] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    obtenirProfil()
      .then((profil) => {
        if (profil) {
          setNomComplet(profil.nom_complet || '')
          setEcole(profil.ecole || '')
        }
      })
      .finally(() => setChargement(false))
  }, [])

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
    </div>
  )
}
