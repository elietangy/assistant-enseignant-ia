import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAbonnement } from '../context/AbonnementContext'
import LoadingSpinner from '../components/LoadingSpinner'

// Page réservée aux administrateurs : liste des inscrits.
// Les données viennent de la fonction SQL admin_liste_inscrits(), qui refuse tout
// utilisateur absent de la table public.admins.

const STATUTS = [
  { valeur: '', label: 'Tous les abonnements' },
  { valeur: 'actif', label: 'Actif' },
  { valeur: 'en_attente', label: 'En attente' },
  { valeur: 'expire', label: 'Expiré' },
  { valeur: 'echoue', label: 'Échoué' },
  { valeur: 'aucun', label: 'Aucun' }
]

const formaterDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('fr-FR') +
      ' ' +
      new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—'

export default function AdminPage() {
  const { estAdmin, chargementAbonnement } = useAbonnement()
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [statut, setStatut] = useState('')

  const charger = async () => {
    setChargement(true)
    setErreur('')
    const { data, error } = await supabase.rpc('admin_liste_inscrits')
    if (error) setErreur(error.message)
    else setLignes(data || [])
    setChargement(false)
  }

  useEffect(() => {
    if (estAdmin) charger()
  }, [estAdmin])

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return lignes.filter((l) => {
      if (statut === 'aucun' ? l.statut_abonnement : statut && l.statut_abonnement !== statut) return false
      return (
        !q ||
        [l.nom_complet, l.email, l.ecole, l.code_parrainage].some((v) => String(v || '').toLowerCase().includes(q))
      )
    })
  }, [lignes, recherche, statut])

  if (chargementAbonnement) return <LoadingSpinner />
  if (!estAdmin) return <Navigate to="/" replace />

  const actifs = lignes.filter((l) => l.statut_abonnement === 'actif')
  const enAttente = lignes.filter((l) => l.statut_abonnement === 'en_attente').length
  const sept = lignes.filter((l) => Date.now() - new Date(l.inscrit_le) < 7 * 864e5).length
  const montant = actifs.reduce((s, l) => s + (l.abonnement_montant || 0), 0)

  const exporterCsv = () => {
    const entetes = ['Nom', 'Email', 'École', 'Niveau', 'Abonnement', 'Montant', 'Fin de période', 'Inscrit le', 'Dernière connexion']
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    const corps = filtrees.map((l) =>
      [l.nom_complet, l.email, l.ecole, l.niveau_enseignement, l.statut_abonnement, l.abonnement_montant, formaterDate(l.periode_fin), formaterDate(l.inscrit_le), formaterDate(l.derniere_connexion)]
        .map(q)
        .join(';')
    )
    const blob = new Blob(['﻿' + [entetes.map(q).join(';'), ...corps].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'inscrits-assistant-enseignant.csv'
    a.click()
  }

  return (
    <div>
      <h1 className="page-titre">Administration – Inscrits</h1>

      {erreur && <div className="message-erreur">Erreur : {erreur}</div>}

      <div className="carte" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div><strong style={{ fontSize: '1.6rem' }}>{lignes.length}</strong><br />Inscrits</div>
        <div><strong style={{ fontSize: '1.6rem' }}>{actifs.length}</strong><br />Abonnés actifs</div>
        <div><strong style={{ fontSize: '1.6rem' }}>{enAttente}</strong><br />En attente</div>
        <div><strong style={{ fontSize: '1.6rem' }}>{sept}</strong><br />Nouveaux (7 jours)</div>
        <div><strong style={{ fontSize: '1.6rem' }}>{montant.toLocaleString('fr-FR')}</strong><br />FCFA (actifs)</div>
      </div>

      <div className="carte" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Rechercher (nom, email, école, code…)"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ flex: 2, minWidth: 180 }}
          />
          <select value={statut} onChange={(e) => setStatut(e.target.value)} style={{ flex: 1, minWidth: 140 }}>
            {STATUTS.map((s) => (
              <option key={s.valeur} value={s.valeur}>{s.label}</option>
            ))}
          </select>
          <button type="button" className="bouton bouton--secondaire" onClick={exporterCsv}>Exporter CSV</button>
          <button type="button" className="bouton" onClick={charger} disabled={chargement}>Actualiser</button>
        </div>

        {chargement ? (
          <LoadingSpinner />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  {['Nom', 'Email', 'École', 'Niveau', 'Abonnement', 'Montant', 'Fin de période', 'Inscrit le', 'Dernière connexion'].map((t) => (
                    <th key={t} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--couleur-bordure)', whiteSpace: 'nowrap' }}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrees.map((l) => (
                  <tr key={l.user_id}>
                    {[l.nom_complet, l.email, l.ecole, l.niveau_enseignement, l.statut_abonnement || 'aucun', l.abonnement_montant, formaterDate(l.periode_fin), formaterDate(l.inscrit_le), formaterDate(l.derniere_connexion)].map((v, i) => (
                      <td key={i} style={{ padding: '8px 10px', borderBottom: '1px solid var(--couleur-bordure)', whiteSpace: 'nowrap' }}>{v ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: 'var(--couleur-texte-discret)', marginBottom: 0 }}>{filtrees.length} sur {lignes.length} inscrit(s)</p>
      </div>
    </div>
  )
}
