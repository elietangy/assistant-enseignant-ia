import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listerEvaluations } from '../lib/evaluationsApi'
import LoadingSpinner from '../components/LoadingSpinner'

export default function EvaluationsDashboardPage() {
  const [evaluations, setEvaluations] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    listerEvaluations()
      .then(setEvaluations)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }, [])

  if (chargement) return <LoadingSpinner />

  return (
    <div>
      <h1 className="page-titre">Mes évaluations</h1>

      {erreur && <div className="message-erreur">{erreur}</div>}

      {evaluations.length === 0 ? (
        <div className="etat-vide">
          <p>Vous n'avez pas encore d'évaluation.</p>
          <Link to="/evaluations/nouvelle" className="bouton">
            Créer ma première évaluation
          </Link>
        </div>
      ) : (
        evaluations.map((ev) => (
          <Link key={ev.id} to={`/evaluations/${ev.id}`} className="carte-fiche">
            <span className="carte-fiche__badge">{ev.matiere}</span>
            <h3>{ev.titre}</h3>
            <p>
              {ev.cycle} · {ev.classe} · {ev.type_evaluation} · {ev.bareme_total} pts
            </p>
          </Link>
        ))
      )}
    </div>
  )
}
