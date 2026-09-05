import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { creerEvaluation, genererEvaluationAvecIA } from '../lib/evaluationsApi'

const CLASSES_PAR_CYCLE = {
  Primaire: ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
  Collège: ['6e', '5e', '4e', '3e'],
  Lycée: ['2nde', '1re', 'Terminale']
}

const TYPES_EVALUATION = [
  { value: 'interrogation', label: 'Interrogation' },
  { value: 'devoir', label: 'Devoir' },
  { value: 'examen', label: 'Examen' }
]

function anneeScolaireParDefaut() {
  const maintenant = new Date()
  const annee = maintenant.getFullYear()
  const debut = maintenant.getMonth() >= 7 ? annee : annee - 1
  return `${debut}-${debut + 1}`
}

export default function NouvelleEvaluationPage() {
  const navigate = useNavigate()
  const [cycle, setCycle] = useState('Primaire')
  const [classe, setClasse] = useState(CLASSES_PAR_CYCLE.Primaire[0])
  const [matiere, setMatiere] = useState('')
  const [themes, setThemes] = useState('')
  const [typeEvaluation, setTypeEvaluation] = useState('interrogation')
  const [dureeMinutes, setDureeMinutes] = useState(55)
  const [baremeTotal, setBaremeTotal] = useState(20)
  const [anneeScolaire, setAnneeScolaire] = useState(anneeScolaireParDefaut())

  const [genererEnCours, setGenererEnCours] = useState(false)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [evaluationGeneree, setEvaluationGeneree] = useState(null)
  const [erreur, setErreur] = useState('')

  const handleChangementCycle = (nouveauCycle) => {
    setCycle(nouveauCycle)
    setClasse(CLASSES_PAR_CYCLE[nouveauCycle][0])
  }

  const handleGenerer = async (e) => {
    e.preventDefault()
    setErreur('')

    if (!matiere.trim() || !themes.trim()) {
      setErreur('Merci de renseigner la matière et les thèmes couverts.')
      return
    }

    setGenererEnCours(true)
    setEvaluationGeneree(null)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      const resultat = await genererEvaluationAvecIA({
        cycle,
        classe,
        matiere: matiere.trim(),
        themes: themes.trim(),
        typeEvaluation,
        dureeMinutes,
        baremeTotal,
        accessToken: session.access_token
      })

      setEvaluationGeneree(resultat)
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
      const nouvelleEvaluation = await creerEvaluation({
        titre: evaluationGeneree.titre || themes.trim(),
        matiere: matiere.trim(),
        cycle,
        classe,
        annee_scolaire: anneeScolaire,
        type_evaluation: typeEvaluation,
        duree_minutes: dureeMinutes,
        bareme_total: baremeTotal,
        consignes: evaluationGeneree.consignes || '',
        contenu: evaluationGeneree.exercices || []
      })

      navigate(`/evaluations/${nouvelleEvaluation.id}`)
    } catch (err) {
      setErreur(err.message)
      setEnregistrementEnCours(false)
    }
  }

  return (
    <div>
      <h1 className="page-titre">Nouvelle évaluation</h1>

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
            <input id="matiere" type="text" required value={matiere} onChange={(e) => setMatiere(e.target.value)} />
          </div>

          <div className="champ">
            <label htmlFor="themes">Thèmes couverts</label>
            <input
              id="themes"
              type="text"
              required
              placeholder="Ex : Les fractions, la géométrie du triangle"
              value={themes}
              onChange={(e) => setThemes(e.target.value)}
            />
          </div>

          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="type">Type</label>
              <select id="type" value={typeEvaluation} onChange={(e) => setTypeEvaluation(e.target.value)}>
                {TYPES_EVALUATION.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="champ">
              <label htmlFor="duree">Durée (minutes)</label>
              <input
                id="duree"
                type="number"
                min="10"
                max="240"
                value={dureeMinutes}
                onChange={(e) => setDureeMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="bareme">Barème total (points)</label>
              <input
                id="bareme"
                type="number"
                min="1"
                max="100"
                value={baremeTotal}
                onChange={(e) => setBaremeTotal(Number(e.target.value))}
              />
            </div>
            <div className="champ">
              <label htmlFor="anneeScolaire">Année scolaire</label>
              <input id="anneeScolaire" type="text" value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="bouton bouton--pleine-largeur" disabled={genererEnCours}>
            {genererEnCours ? 'Génération en cours…' : "Générer l'évaluation avec l'IA"}
          </button>
        </form>
      </div>

      {evaluationGeneree && (
        <div className="carte">
          <h2 style={{ marginTop: 0 }}>{evaluationGeneree.titre}</h2>
          <p>{evaluationGeneree.consignes}</p>

          {(evaluationGeneree.exercices || []).map((item, i) => (
            <div key={i} className="etape-bloc">
              <strong>
                Question {i + 1} {item.bareme ? `(${item.bareme})` : ''}
              </strong>
              <p style={{ margin: '6px 0' }}>{item.enonce}</p>
              <p style={{ margin: 0, color: 'var(--couleur-texte-discret)' }}>
                <em>Corrigé :</em> {item.corrige}
              </p>
            </div>
          ))}

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
