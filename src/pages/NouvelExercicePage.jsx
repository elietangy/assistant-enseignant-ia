import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { creerExercice, genererExercicesAvecIA } from '../lib/exercicesApi'

const CLASSES_PAR_CYCLE = {
  Primaire: ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
  Collège: ['6e', '5e', '4e', '3e'],
  Lycée: ['2nde', '1re', 'Terminale']
}

function anneeScolaireParDefaut() {
  const maintenant = new Date()
  const annee = maintenant.getFullYear()
  const debut = maintenant.getMonth() >= 7 ? annee : annee - 1
  return `${debut}-${debut + 1}`
}

export default function NouvelExercicePage() {
  const navigate = useNavigate()
  const [cycle, setCycle] = useState('Primaire')
  const [classe, setClasse] = useState(CLASSES_PAR_CYCLE.Primaire[0])
  const [matiere, setMatiere] = useState('')
  const [theme, setTheme] = useState('')
  const [nombreExercices, setNombreExercices] = useState(5)
  const [anneeScolaire, setAnneeScolaire] = useState(anneeScolaireParDefaut())

  const [genererEnCours, setGenererEnCours] = useState(false)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)
  const [exercicesGeneres, setExercicesGeneres] = useState(null)
  const [erreur, setErreur] = useState('')

  const handleChangementCycle = (nouveauCycle) => {
    setCycle(nouveauCycle)
    setClasse(CLASSES_PAR_CYCLE[nouveauCycle][0])
  }

  const handleGenerer = async (e) => {
    e.preventDefault()
    setErreur('')

    if (!matiere.trim() || !theme.trim()) {
      setErreur('Merci de renseigner la matière et le thème.')
      return
    }

    setGenererEnCours(true)
    setExercicesGeneres(null)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      const resultat = await genererExercicesAvecIA({
        cycle,
        classe,
        matiere: matiere.trim(),
        theme: theme.trim(),
        nombreExercices,
        accessToken: session.access_token
      })

      setExercicesGeneres(resultat)
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
      const nouvelExercice = await creerExercice({
        titre: exercicesGeneres.titre || theme.trim(),
        matiere: matiere.trim(),
        cycle,
        classe,
        annee_scolaire: anneeScolaire,
        consignes: exercicesGeneres.consignes || '',
        contenu: exercicesGeneres.exercices || []
      })

      navigate(`/exercices/${nouvelExercice.id}`)
    } catch (err) {
      setErreur(err.message)
      setEnregistrementEnCours(false)
    }
  }

  return (
    <div>
      <h1 className="page-titre">Nouveaux exercices / devoirs</h1>

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
            <label htmlFor="theme">Thème</label>
            <input id="theme" type="text" required value={theme} onChange={(e) => setTheme(e.target.value)} />
          </div>

          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="nombre">Nombre d'exercices</label>
              <input
                id="nombre"
                type="number"
                min="1"
                max="15"
                value={nombreExercices}
                onChange={(e) => setNombreExercices(Number(e.target.value))}
              />
            </div>
            <div className="champ">
              <label htmlFor="anneeScolaire">Année scolaire</label>
              <input id="anneeScolaire" type="text" value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="bouton bouton--pleine-largeur" disabled={genererEnCours}>
            {genererEnCours ? 'Génération en cours…' : "Générer les exercices avec l'IA"}
          </button>
        </form>
      </div>

      {exercicesGeneres && (
        <div className="carte">
          <h2 style={{ marginTop: 0 }}>{exercicesGeneres.titre}</h2>
          <p>{exercicesGeneres.consignes}</p>

          {(exercicesGeneres.exercices || []).map((exo, i) => (
            <div key={i} className="etape-bloc">
              <strong>Exercice {i + 1}</strong>
              <p style={{ margin: '6px 0' }}>{exo.enonce}</p>
              <p style={{ margin: 0, color: 'var(--couleur-texte-discret)' }}>
                <em>Corrigé :</em> {exo.corrige}
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
