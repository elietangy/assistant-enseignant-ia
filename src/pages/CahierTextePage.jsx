import { useEffect, useState } from 'react'
import { creerEntreeCahierTexte, listerCahierTexte, supprimerEntreeCahierTexte } from '../lib/cahierTexteApi'
import LoadingSpinner from '../components/LoadingSpinner'

function dateDuJour() {
  return new Date().toISOString().slice(0, 10)
}

function formaterDate(dateIso) {
  return new Date(dateIso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default function CahierTextePage() {
  const [entrees, setEntrees] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)

  const [dateCours, setDateCours] = useState(dateDuJour())
  const [matiere, setMatiere] = useState('')
  const [cycle, setCycle] = useState('')
  const [classe, setClasse] = useState('')
  const [contenu, setContenu] = useState('')

  const chargerEntrees = () => {
    listerCahierTexte()
      .then(setEntrees)
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }

  useEffect(() => {
    chargerEntrees()
  }, [])

  const handleAjouter = async (e) => {
    e.preventDefault()
    setErreur('')

    if (!matiere.trim() || !contenu.trim()) {
      setErreur('Merci de renseigner au moins la matière et le contenu enseigné.')
      return
    }

    setEnregistrement(true)
    try {
      const nouvelleEntree = await creerEntreeCahierTexte({
        date_cours: dateCours,
        matiere: matiere.trim(),
        cycle: cycle.trim(),
        classe: classe.trim(),
        contenu: contenu.trim()
      })
      setEntrees((precedent) => [nouvelleEntree, ...precedent])
      setMatiere('')
      setClasse('')
      setContenu('')
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnregistrement(false)
    }
  }

  const handleSupprimer = async (id) => {
    if (!window.confirm('Supprimer cette entrée du cahier de textes ?')) return
    try {
      await supprimerEntreeCahierTexte(id)
      setEntrees((precedent) => precedent.filter((e) => e.id !== id))
    } catch (err) {
      setErreur(err.message)
    }
  }

  if (chargement) return <LoadingSpinner />

  return (
    <div>
      <h1 className="page-titre">Cahier de textes</h1>

      {erreur && <div className="message-erreur">{erreur}</div>}

      <div className="carte">
        <h2 style={{ marginTop: 0 }}>Ajouter ce qui a été enseigné</h2>
        <form onSubmit={handleAjouter}>
          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="dateCours">Date</label>
              <input id="dateCours" type="date" value={dateCours} onChange={(e) => setDateCours(e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="matiere">Matière</label>
              <input id="matiere" value={matiere} onChange={(e) => setMatiere(e.target.value)} />
            </div>
          </div>

          <div className="champ--ligne">
            <div className="champ">
              <label htmlFor="cycle">Cycle</label>
              <input id="cycle" value={cycle} onChange={(e) => setCycle(e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="classe">Classe</label>
              <input id="classe" value={classe} onChange={(e) => setClasse(e.target.value)} />
            </div>
          </div>

          <div className="champ">
            <label htmlFor="contenu">Contenu enseigné</label>
            <textarea
              id="contenu"
              placeholder="Ex : Les fractions simples — introduction et exercices d'application"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
            />
          </div>

          <button type="submit" className="bouton" disabled={enregistrement}>
            {enregistrement ? 'Ajout…' : 'Ajouter au cahier de textes'}
          </button>
        </form>
      </div>

      {entrees.length === 0 ? (
        <div className="etat-vide">Aucune entrée pour l'instant.</div>
      ) : (
        entrees.map((entree) => (
          <div key={entree.id} className="carte-fiche" style={{ cursor: 'default' }}>
            <div className="etape-bloc__entete">
              <span className="carte-fiche__badge">{entree.matiere}</span>
              <button className="lien-supprimer" onClick={() => handleSupprimer(entree.id)}>
                Supprimer
              </button>
            </div>
            <h3 style={{ textTransform: 'capitalize' }}>{formaterDate(entree.date_cours)}</h3>
            <p>
              {[entree.cycle, entree.classe].filter(Boolean).join(' · ')}
            </p>
            <p style={{ color: 'var(--couleur-texte)' }}>{entree.contenu}</p>
          </div>
        ))
      )}
    </div>
  )
}
