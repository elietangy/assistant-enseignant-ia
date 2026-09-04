import { Link } from 'react-router-dom'

export default function FicheCard({ fiche }) {
  return (
    <Link to={`/fiche/${fiche.id}`} className="carte-fiche">
      <span className="carte-fiche__badge">{fiche.matiere}</span>
      <h3>{fiche.titre}</h3>
      <p>
        {fiche.cycle} · {fiche.classe}
        {fiche.annee_scolaire ? ` · ${fiche.annee_scolaire}` : ''}
      </p>
    </Link>
  )
}
