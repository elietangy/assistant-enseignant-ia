import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { modifierExercice, obtenirExercice, supprimerExercice } from '../lib/exercicesApi'
import { obtenirProfil } from '../lib/fichesApi'
import { exporterExercicesPDF } from '../lib/pdfExport'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ExerciceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [messageSucces, setMessageSucces] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)
  const [suppression, setSuppression] = useState(false)

  const [titre, setTitre] = useState('')
  const [matiere, setMatiere] = useState('')
  const [cycle, setCycle] = useState('')
  const [classe, setClasse] = useState('')
  const [anneeScolaire, setAnneeScolaire] = useState('')
  const [consignes, setConsignes] = useState('')
  const [contenu, setContenu] = useState([])

  useEffect(() => {
    obtenirExercice(id)
      .then((exo) => {
        setTitre(exo.titre || '')
        setMatiere(exo.matiere || '')
        setCycle(exo.cycle || '')
        setClasse(exo.classe || '')
        setAnneeScolaire(exo.annee_scolaire || '')
        setConsignes(exo.consignes || '')
        setContenu(exo.contenu && exo.contenu.length ? exo.contenu : [{ enonce: '', corrige: '' }])
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false))
  }, [id])

  const modifierItem = (index, champ, valeur) => {
    setContenu((precedent) => {
      const copie = [...precedent]
      copie[index] = { ...copie[index], [champ]: valeur }
      return copie
    })
  }

  const ajouterItem = () => setContenu((p) => [...p, { enonce: '', corrige: '' }])
  const supprimerItem = (index) => setContenu((p) => p.filter((_, i) => i !== index))

  const construireExerciceActuel = () => ({
    titre,
    matiere,
    cycle,
    classe,
    annee_scolaire: anneeScolaire,
    consignes,
    contenu: contenu.filter((e) => e.enonce || e.corrige)
  })

  const handleEnregistrer = async (e) => {
    e.preventDefault()
    setErreur('')
    setMessageSucces('')
    setEnregistrement(true)

    try {
      await modifierExercice(id, construireExerciceActuel())
      setMessageSucces('Modifications enregistrées.')
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnregistrement(false)
    }
  }

  const handleExportPDF = async () => {
    const profil = await obtenirProfil().catch(() => null)
    exporterExercicesPDF(construireExerciceActuel(), profil)
  }

  const handleSupprimer = async () => {
    if (!window.confirm('Supprimer définitivement ces exercices ?')) return
    setSuppression(true)
    try {
      await supprimerExercice(id)
      navigate('/exercices')
    } catch (err) {
      setErreur(err.message)
      setSuppression(false)
    }
  }

  if (chargement) return <LoadingSpinner />
  if (erreur && !titre) return <div className="message-erreur">{erreur}</div>

  return (
    <div>
      <h1 className="page-titre">Modifier les exercices</h1>

      {erreur && <div className="message-erreur">{erreur}</div>}
      {messageSucces && <div className="message-info">{messageSucces}</div>}

      <div className="actions-fiche">
        <button className="bouton bouton--secondaire" onClick={handleExportPDF}>
          Exporter en PDF
        </button>
        <button className="bouton bouton--danger" onClick={handleSupprimer} disabled={suppression}>
          {suppression ? 'Suppression…' : 'Supprimer'}
        </button>
      </div>

      <form onSubmit={handleEnregistrer} className="carte">
        <div className="champ--ligne">
          <div className="champ">
            <label>Matière</label>
            <input value={matiere} onChange={(e) => setMatiere(e.target.value)} />
          </div>
          <div className="champ">
            <label>Année scolaire</label>
            <input value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} />
          </div>
        </div>

        <div className="champ--ligne">
          <div className="champ">
            <label>Cycle</label>
            <input value={cycle} onChange={(e) => setCycle(e.target.value)} />
          </div>
          <div className="champ">
            <label>Classe</label>
            <input value={classe} onChange={(e) => setClasse(e.target.value)} />
          </div>
        </div>

        <div className="champ">
          <label>Titre</label>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} />
        </div>

        <div className="champ">
          <label>Consignes</label>
          <textarea value={consignes} onChange={(e) => setConsignes(e.target.value)} />
        </div>

        <label>Exercices</label>
        {contenu.map((item, i) => (
          <div className="etape-bloc" key={i}>
            <div className="etape-bloc__entete">
              <strong>Exercice {i + 1}</strong>
              <button type="button" className="lien-supprimer" onClick={() => supprimerItem(i)}>
                Supprimer
              </button>
            </div>
            <div className="champ">
              <label>Énoncé</label>
              <textarea value={item.enonce} onChange={(e) => modifierItem(i, 'enonce', e.target.value)} />
            </div>
            <div className="champ">
              <label>Corrigé</label>
              <textarea value={item.corrige} onChange={(e) => modifierItem(i, 'corrige', e.target.value)} />
            </div>
          </div>
        ))}
        <button type="button" className="bouton bouton--secondaire" onClick={ajouterItem} style={{ marginBottom: 18 }}>
          + Ajouter un exercice
        </button>

        <button type="submit" className="bouton" disabled={enregistrement}>
          {enregistrement ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  )
}
