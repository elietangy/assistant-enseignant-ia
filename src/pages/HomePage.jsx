import { Link } from 'react-router-dom'

const MODULES = [
  {
    to: '/fiches',
    titre: 'Fiches de cours',
    description: 'Générer et organiser vos fiches de préparation par IA'
  },
  {
    to: '/exercices',
    titre: 'Exercices & devoirs',
    description: 'Générer des exercices avec corrigés, adaptés au niveau'
  },
  {
    to: '/evaluations',
    titre: "Évaluations",
    description: 'Interrogations, devoirs et examens avec barème'
  },
  {
    to: '/cahier-texte',
    titre: 'Cahier de textes',
    description: 'Suivre ce qui a été enseigné, date par date'
  },
  {
    to: '/emploi-du-temps',
    titre: 'Emploi du temps',
    description: 'Votre planning hebdomadaire de cours'
  },
  {
    to: '/profil',
    titre: 'Mon profil',
    description: "Nom et école affichés sur vos documents exportés"
  }
]

export default function HomePage() {
  return (
    <div>
      <h1 className="page-titre">Que voulez-vous préparer aujourd'hui ?</h1>
      <div className="grille-modules">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="carte-module">
            <h3>{m.titre}</h3>
            <p>{m.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
