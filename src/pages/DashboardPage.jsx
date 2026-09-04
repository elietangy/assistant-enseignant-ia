import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fichesEnCache, listerFiches } from '../lib/fichesApi'
import FicheCard from '../components/FicheCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function DashboardPage() {
  const [fiches, setFiches] = useState([])
  const [chargement, setChargement] = useState(true)
  const [horsLigne, setHorsLigne] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [filtreMatiere, setFiltreMatiere] = useState('')
  const [filtreCycle, setFiltreCycle] = useState('')

  useEffect(() => {
    let annule = false

    listerFiches()
      .then((data) => {
        if (!annule) {
          setFiches(data)
          setHorsLigne(false)
        }
      })
      .catch(() => {
        if (!annule) {
          setFiches(fichesEnCache())
          setHorsLigne(true)
        }
      })
      .finally(() => {
        if (!annule) setChargement(false)
      })

    return () => {
      annule = true
    }
  }, [])

  const matieres = useMemo(
    () => [...new Set(fiches.map((f) => f.matiere).filter(Boolean))].sort(),
    [fiches]
  )
  const cycles = useMemo(() => [...new Set(fiches.map((f) => f.cycle).filter(Boolean))].sort(), [fiches])

  const fichesFiltrees = fiches.filter((fiche) => {
    const correspondRecherche = fiche.titre.toLowerCase().includes(recherche.toLowerCase())
    const correspondMatiere = !filtreMatiere || fiche.matiere === filtreMatiere
    const correspondCycle = !filtreCycle || fiche.cycle === filtreCycle
    return correspondRecherche && correspondMatiere && correspondCycle
  })

  if (chargement) return <LoadingSpinner />

  return (
    <div>
      <h1 className="page-titre">Ma bibliothèque de fiches</h1>

      {horsLigne && (
        <div className="message-info">
          Vous êtes hors connexion : affichage des fiches déjà enregistrées sur cet appareil.
        </div>
      )}

      {fiches.length > 0 && (
        <div className="filtres">
          <input
            type="search"
            placeholder="Rechercher un thème…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <select value={filtreMatiere} onChange={(e) => setFiltreMatiere(e.target.value)}>
            <option value="">Toutes les matières</option>
            {matieres.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select value={filtreCycle} onChange={(e) => setFiltreCycle(e.target.value)}>
            <option value="">Tous les cycles</option>
            {cycles.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {fiches.length === 0 ? (
        <div className="etat-vide">
          <p>Vous n'avez pas encore de fiche de cours.</p>
          <Link to="/nouvelle-fiche" className="bouton">
            Créer ma première fiche
          </Link>
        </div>
      ) : (
        <>
          {fichesFiltrees.length === 0 && <div className="etat-vide">Aucune fiche ne correspond à ces critères.</div>}
          {fichesFiltrees.map((fiche) => (
            <FicheCard key={fiche.id} fiche={fiche} />
          ))}
        </>
      )}
    </div>
  )
}
