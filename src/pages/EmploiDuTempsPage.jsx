import { useEffect, useState } from 'react'
import { JOURS_SEMAINE, creerCreneau, listerCreneaux, supprimerCreneau } from '../lib/emploiDuTempsApi'
import LoadingSpinner from '../components/LoadingSpinner'

export default function EmploiDuTempsPage() {
  const [creneaux, setCreneaux] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)

  const [jourSemaine, setJourSemaine] = useState('lundi')
  const [heureDebut, setHeureDebut] = useState('08:00')
  const [heureFin, setHeureFin] = useState('09:00')
  const [matiere, setMatiere] = useState('')
  const [classe, setClasse] = useState('')
  const [salle, setSalle] = useState('')

  useEffect(() => {
    listerCreneaux()
      .then(setCreneaux)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }, [])

  const handleAjouter = async (e) => {
    e.preventDefault()
    setErreur('')

    if (!matiere.trim()) {
      setErreur('Merci de renseigner la matière.')
      return
    }

    setEnregistrement(true)
    try {
      const nouveauCreneau = await creerCreneau({
        jour_semaine: jourSemaine,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        matiere: matiere.trim(),
        classe: classe.trim(),
        salle: salle.trim()
      })
      setCreneaux((precedent) => [...precedent, nouveauCreneau])
      setMatiere('')
      setClasse('')
      setSalle('')
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnregistrement(false)
    }
  }

  const handleSupprimer = async (id) => {
    try {
      await supprimerCreneau(id)
      setCreneaux((precedent) => precedent.filter((c) => c.id !== id))
    } catch (err) {
      setErreur(err.message)
    }
  }

  if (chargement) return <LoadingSpinner />

  return (
    <div>
      <h1 className="page-titre">Mon emploi du temps</h1>

      {erreur && <div className="message-erreur">{erreur}</div>}

      <div className="carte">
        <h2 style={{ marginTop: 0 }}>Ajouter un créneau</h2>
        <form onSubmit={handleAjouter}>
          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="jour">Jour</label>
              <select id="jour" value={jourSemaine} onChange={(e) => setJourSemaine(e.target.value)}>
                {JOURS_SEMAINE.map((j) => (
                  <option key={j} value={j} style={{ textTransform: 'capitalize' }}>
                    {j.charAt(0).toUpperCase() + j.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="champ">
              <label htmlFor="matiere">Matière</label>
              <input id="matiere" value={matiere} onChange={(e) => setMatiere(e.target.value)} />
            </div>
          </div>

          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="heureDebut">Heure de début</label>
              <input id="heureDebut" type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="heureFin">Heure de fin</label>
              <input id="heureFin" type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
            </div>
          </div>

          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="classe">Classe</label>
              <input id="classe" value={classe} onChange={(e) => setClasse(e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="salle">Salle (optionnel)</label>
              <input id="salle" value={salle} onChange={(e) => setSalle(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="bouton" disabled={enregistrement}>
            {enregistrement ? 'Ajout…' : 'Ajouter au planning'}
          </button>
        </form>
      </div>

      {JOURS_SEMAINE.map((jour) => {
        const creneauxDuJour = creneaux.filter((c) => c.jour_semaine === jour)
        if (creneauxDuJour.length === 0) return null

        return (
          <div key={jour} className="carte">
            <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{jour}</h3>
            {creneauxDuJour.map((c) => (
              <div key={c.id} className="etape-bloc">
                <div className="etape-bloc__entete">
                  <strong>
                    {c.heure_debut.slice(0, 5)} – {c.heure_fin.slice(0, 5)} · {c.matiere}
                  </strong>
                  <button className="lien-supprimer" onClick={() => handleSupprimer(c.id)}>
                    Supprimer
                  </button>
                </div>
                <p style={{ margin: 0, color: 'var(--couleur-texte-discret)' }}>
                  {[c.classe, c.salle].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        )
      })}

      {creneaux.length === 0 && <div className="etat-vide">Aucun créneau enregistré pour l'instant.</div>}
    </div>
  )
}
