import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listerExercices } from '../lib/exercicesApi'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ExercicesDashboardPage() {
  const [exercices, setExercices] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    listerExercices()
      .then(setExercices)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }, [])

  if (chargement) return <LoadingSpinner />

  return (
    <div>
      <h1 className="page-titre">Mes exercices & devoirs</h1>

      {erreur && <div className="message-erreur">{erreur}</div>}

      {exercices.length === 0 ? (
        <div className="etat-vide">
          <p>Vous n'avez pas encore d'exercice.</p>
          <Link to="/exercices/nouveau" className="bouton">
            Créer mes premiers exercices
          </Link>
        </div>
      ) : (
        exercices.map((exo) => (
          <Link key={exo.id} to={`/exercices/${exo.id}`} className="carte-fiche">
            <span className="carte-fiche__badge">{exo.matiere}</span>
            <h3>{exo.titre}</h3>
            <p>
              {exo.cycle} · {exo.classe}
              {exo.annee_scolaire ? ` · ${exo.annee_scolaire}` : ''}
            </p>
          </Link>
        ))
      )}
    </div>
  )
}
