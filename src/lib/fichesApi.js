import { supabase } from '../supabaseClient'

const CLE_CACHE = 'aei_fiches_cache'

export async function genererFicheAvecIA({ cycle, classe, matiere, theme, dureeMinutes, accessToken }) {
  const reponse = await fetch('/api/generate-fiche', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle, classe, matiere, theme, dureeMinutes, accessToken })
  })

  let donnees
  try {
    donnees = await reponse.json()
  } catch {
    throw new Error(
      "Impossible de contacter la génération IA (réponse invalide). En local, utilisez 'netlify dev' plutôt que 'npm run dev' pour que cette fonction soit disponible."
    )
  }

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'La génération a échoué. Réessayez.')
  }

  return donnees.fiche
}

export async function listerFiches() {
  const { data, error } = await supabase
    .from('fiches_cours')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  mettreFichesEnCache(data)
  return data
}

export function fichesEnCache() {
  try {
    const brut = localStorage.getItem(CLE_CACHE)
    return brut ? JSON.parse(brut) : []
  } catch {
    return []
  }
}

function mettreFichesEnCache(fiches) {
  try {
    localStorage.setItem(CLE_CACHE, JSON.stringify(fiches))
  } catch {
    // Stockage local plein ou indisponible : on continue sans cache.
  }
}

export async function obtenirFiche(id) {
  const { data, error } = await supabase.from('fiches_cours').select('*').eq('id', id).single()

  if (error) throw error
  return data
}

export function obtenirFicheEnCache(id) {
  return fichesEnCache().find((fiche) => fiche.id === id) || null
}

export async function creerFiche(fiche) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('fiches_cours')
    .insert({ ...fiche, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function modifierFiche(id, changements) {
  const { data, error } = await supabase
    .from('fiches_cours')
    .update({ ...changements, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function supprimerFiche(id) {
  const { error } = await supabase.from('fiches_cours').delete().eq('id', id)
  if (error) throw error
}

export async function obtenirProfil() {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) return null
  return data
}

export async function enregistrerProfil(changements) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('profiles')
    .update(changements)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}
