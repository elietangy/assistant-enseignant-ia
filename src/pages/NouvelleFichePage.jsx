import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { creerFiche, genererFicheAvecIA } from '../lib/fichesApi'

const CLASSES_PAR_CYCLE = {
  Primaire: ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
  Collège: ['6e', '5e', '4e', '3e'],
  Lycée: ['2nde', '1re', 'Terminale']
}

const SUGGESTIONS_MATIERES = [
  'Français',
  'Mathématiques',
  'Sciences de la Vie et de la Terre',
  'Histoire-Géographie',
  'Anglais',
  'Éducation civique et morale',
  'Physique-Chimie',
  'Éducation Physique et Sportive'
]

function anneeScolaireParDefaut() {
  const maintenant = new Date()
  const annee = maintenant.getFullYear()
  const debut = maintenant.getMonth() >= 7 ? annee : annee - 1
  return `${debut}-${debut + 1}`
}

export default function NouvelleFichePage() {
  const navigate = useNavigate()
  const [cycle, setCycle] = useState('Primaire')
  const [classe, setClasse] = useState(CLASSES_PAR_CYCLE.Primaire[0])
  const [matiere, setMatiere] = useState('')
  const [theme, setTheme] = useState('')
  const [dureeMinutes, setDureeMinutes] = useState(55)
  const [anneeScolaire, setAnneeScolaire] = useState(anneeScolaireParDefaut())

  const [genererEnCours, setGenererEnCours] = useState(false)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [ficheGeneree, setFicheGeneree] = useState(null)
  const [erreur, setErreur] = useState('')

  const handleChangementCycle = (nouveauCycle) => {
    setCycle(nouveauCycle)
    setClasse(CLASSES_PAR_CYCLE[nouveauCycle][0])
  }

  const handleGenerer = async (e) => {
    e.preventDefault()
    setErreur('')

    if (!matiere.trim() || !theme.trim()) {
      setErreur('Merci de renseigner la matière et le thème du cours.')
      return
    }

    setGenererEnCours(true)
    setFicheGeneree(null)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      const resultat = await genererFicheAvecIA({
        cycle,
        classe,
        matiere: matiere.trim(),
        theme: theme.trim(),
        dureeMinutes,
        accessToken: session.access_token
      })

      setFicheGeneree(resultat)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setGenererEnCours(false)
    }
  }

  const handleEnregistrer = async () => {
    setErreur('')
    setEnregistrementEnCours(true)

    try {
      const nouvelleFiche = await creerFiche({
        titre: theme.trim(),
        matiere: matiere.trim(),
        cycle,
        classe,
        annee_scolaire: anneeScolaire,
        objectifs: ficheGeneree.objectifs || [],
        deroulement: ficheGeneree.deroulement || [],
        materiel: ficheGeneree.materiel || '',
        evaluation: ficheGeneree.evaluation || ''
      })

      navigate(`/fiche/${nouvelleFiche.id}`)
    } catch (err) {
      setErreur(err.message)
      setEnregistrementEnCours(false)
    }
  }

  return (
    <div>
      <h1 className="page-titre">Nouvelle fiche de cours</h1>

      {erreur && <div className="message-erreur">{erreur}</div>}

      <div className="carte">
        <form onSubmit={handleGenerer}>
          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="cycle">Cycle</label>
              <select id="cycle" value={cycle} onChange={(e) => handleChangementCycle(e.target.value)}>
                {Object.keys(CLASSES_PAR_CYCLE).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="champ">
              <label htmlFor="classe">Classe</label>
              <select id="classe" value={classe} onChange={(e) => setClasse(e.target.value)}>
                {CLASSES_PAR_CYCLE[cycle].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="champ">
            <label htmlFor="matiere">Matière</label>
            <input
              id="matiere"
              list="suggestions-matieres"
              type="text"
              required
              value={matiere}
              onChange={(e) => setMatiere(e.target.value)}
              placeholder="Ex : Mathématiques"
            />
            <datalist id="suggestions-matieres">
              {SUGGESTIONS_MATIERES.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <div className="champ">
            <label htmlFor="theme">Thème du cours</label>
            <input
              id="theme"
              type="text"
              required
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex : La multiplication à deux chiffres"
            />
          </div>

          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="duree">Durée prévue (minutes)</label>
              <input
                id="duree"
                type="number"
                min="10"
                max="180"
                value={dureeMinutes}
                onChange={(e) => setDureeMinutes(Number(e.target.value))}
              />
            </div>
            <div className="champ">
              <label htmlFor="anneeScolaire">Année scolaire</label>
              <input id="anneeScolaire" type="text" value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="bouton bouton--pleine-largeur" disabled={genererEnCours}>
            {genererEnCours ? 'Génération en cours…' : 'Générer la fiche avec l\'IA'}
          </button>
        </form>
      </div>

      {ficheGeneree && (
        <div className="carte">
          <h2 style={{ marginTop: 0 }}>Aperçu de la fiche générée</h2>

          <h3>Objectifs pédagogiques</h3>
          <ul>
            {(ficheGeneree.objectifs || []).map((objectif, i) => (
              <li key={i}>{objectif}</li>
            ))}
          </ul>

          <h3>Déroulement</h3>
          {(ficheGeneree.deroulement || []).map((etape, i) => (
            <div key={i} className="etape-bloc">
              <strong>
                {etape.etape} {etape.duree ? `(${etape.duree})` : ''}
              </strong>
              <p style={{ margin: '6px 0 0' }}>{etape.activite}</p>
            </div>
          ))}

          <h3>Matériel nécessaire</h3>
          <p>{ficheGeneree.materiel}</p>

          <h3>Évaluation</h3>
          <p>{ficheGeneree.evaluation}</p>

          <div className="pied-formulaire">
            <button className="bouton" onClick={handleEnregistrer} disabled={enregistrementEnCours}>
              {enregistrementEnCours ? 'Enregistrement…' : 'Enregistrer dans ma bibliothèque'}
            </button>
            <button className="bouton bouton--secondaire" onClick={handleGenerer} disabled={genererEnCours}>
              Générer une nouvelle version
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
