import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  modifierFiche,
  obtenirFiche,
  obtenirFicheEnCache,
  obtenirProfil,
  supprimerFiche
} from '../lib/fichesApi'
import { exporterFichePDF } from '../lib/pdfExport'
import LoadingSpinner from '../components/LoadingSpinner'

export default function FicheDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [chargement, setChargement] = useState(true)
  const [horsLigne, setHorsLigne] = useState(false)
  const [erreur, setErreur] = useState('')
  const [messageSucces, setMessageSucces] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)
  const [suppression, setSuppression] = useState(false)

  const [titre, setTitre] = useState('')
  const [matiere, setMatiere] = useState('')
  const [cycle, setCycle] = useState('')
  const [classe, setClasse] = useState('')
  const [anneeScolaire, setAnneeScolaire] = useState('')
  const [objectifsTexte, setObjectifsTexte] = useState('')
  const [deroulement, setDeroulement] = useState([])
  const [materiel, setMateriel] = useState('')
  const [evaluation, setEvaluation] = useState('')

  const chargerDansFormulaire = (fiche) => {
    setTitre(fiche.titre || '')
    setMatiere(fiche.matiere || '')
    setCycle(fiche.cycle || '')
    setClasse(fiche.classe || '')
    setAnneeScolaire(fiche.annee_scolaire || '')
    setObjectifsTexte((fiche.objectifs || []).join('\n'))
    setDeroulement(fiche.deroulement && fiche.deroulement.length ? fiche.deroulement : [{ etape: '', duree: '', activite: '' }])
    setMateriel(fiche.materiel || '')
    setEvaluation(fiche.evaluation || '')
  }

  useEffect(() => {
    let annule = false

    obtenirFiche(id)
      .then((fiche) => {
        if (!annule) {
          chargerDansFormulaire(fiche)
          setHorsLigne(false)
        }
      })
      .catch(() => {
        const ficheCache = obtenirFicheEnCache(id)
        if (!annule) {
          if (ficheCache) {
            chargerDansFormulaire(ficheCache)
            setHorsLigne(true)
          } else {
            setErreur("Impossible de charger cette fiche (hors connexion et non disponible en cache).")
          }
        }
      })
      .finally(() => {
        if (!annule) setChargement(false)
      })

    return () => {
      annule = true
    }
  }, [id])

  const modifierEtape = (index, champ, valeur) => {
    setDeroulement((precedent) => {
      const copie = [...precedent]
      copie[index] = { ...copie[index], [champ]: valeur }
      return copie
    })
  }

  const ajouterEtape = () => {
    setDeroulement((precedent) => [...precedent, { etape: '', duree: '', activite: '' }])
  }

  const supprimerEtape = (index) => {
    setDeroulement((precedent) => precedent.filter((_, i) => i !== index))
  }

  const construireFicheActuelle = () => ({
    titre,
    matiere,
    cycle,
    classe,
    annee_scolaire: anneeScolaire,
    objectifs: objectifsTexte
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    deroulement: deroulement.filter((e) => e.etape || e.activite),
    materiel,
    evaluation
  })

  const handleEnregistrer = async (e) => {
    e.preventDefault()
    setErreur('')
    setMessageSucces('')
    setEnregistrement(true)

    try {
      await modifierFiche(id, construireFicheActuelle())
      setMessageSucces('Modifications enregistrées.')
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnregistrement(false)
    }
  }

  const handleExportPDF = async () => {
    const profil = await obtenirProfil().catch(() => null)
    exporterFichePDF({ ...construireFicheActuelle(), id }, profil)
  }

  const handleSupprimer = async () => {
    if (!window.confirm('Supprimer définitivement cette fiche ?')) return

    setSuppression(true)
    try {
      await supprimerFiche(id)
      navigate('/fiches')
    } catch (err) {
      setErreur(err.message)
      setSuppression(false)
    }
  }

  if (chargement) return <LoadingSpinner />

  if (erreur && !titre) {
    return <div className="message-erreur">{erreur}</div>
  }

  return (
    <div>
      <h1 className="page-titre">Modifier la fiche</h1>

      {horsLigne && (
        <div className="message-info">
          Hors connexion : vous consultez une version en cache. Les modifications seront tentées à la reconnexion.
        </div>
      )}
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
            <label htmlFor="matiere">Matière</label>
            <input id="matiere" value={matiere} onChange={(e) => setMatiere(e.target.value)} />
          </div>
          <div className="champ">
            <label htmlFor="anneeScolaire">Année scolaire</label>
            <input id="anneeScolaire" value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} />
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
          <label htmlFor="titre">Thème</label>
          <input id="titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
        </div>

        <div className="champ">
          <label htmlFor="objectifs">Objectifs pédagogiques (un par ligne)</label>
          <textarea id="objectifs" value={objectifsTexte} onChange={(e) => setObjectifsTexte(e.target.value)} />
        </div>

        <label>Déroulement</label>
        {deroulement.map((etape, i) => (
          <div className="etape-bloc" key={i}>
            <div className="etape-bloc__entete">
              <strong>Étape {i + 1}</strong>
              <button type="button" className="lien-supprimer" onClick={() => supprimerEtape(i)}>
                Supprimer
              </button>
            </div>
            <div className="champ--ligne">
              <div className="champ">
                <label>Nom de l'étape</label>
                <input value={etape.etape} onChange={(e) => modifierEtape(i, 'etape', e.target.value)} />
              </div>
              <div className="champ" style={{ maxWidth: 110 }}>
                <label>Durée</label>
                <input value={etape.duree} onChange={(e) => modifierEtape(i, 'duree', e.target.value)} />
              </div>
            </div>
            <div className="champ">
              <label>Activité</label>
              <textarea value={etape.activite} onChange={(e) => modifierEtape(i, 'activite', e.target.value)} />
            </div>
          </div>
        ))}
        <button type="button" className="bouton bouton--secondaire" onClick={ajouterEtape} style={{ marginBottom: 18 }}>
          + Ajouter une étape
        </button>

        <div className="champ">
          <label htmlFor="materiel">Matériel nécessaire</label>
          <textarea id="materiel" value={materiel} onChange={(e) => setMateriel(e.target.value)} />
        </div>

        <div className="champ">
          <label htmlFor="evaluation">Évaluation</label>
          <textarea id="evaluation" value={evaluation} onChange={(e) => setEvaluation(e.target.value)} />
        </div>

        <button type="submit" className="bouton" disabled={enregistrement}>
          {enregistrement ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  )
}
