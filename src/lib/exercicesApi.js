import { supabase } from '../supabaseClient'

export async function genererExercicesAvecIA({ cycle, classe, matiere, theme, nombreExercices, accessToken }) {
  const reponse = await fetch('/api/generate-exercices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle, classe, matiere, theme, nombreExercices, accessToken })
  })

  let donnees
  try {
    donnees = await reponse.json()
  } catch {
    throw new Error(
      "Impossible de contacter la génération IA (réponse invalide). En local, utilisez 'netlify dev' plutôt que 'npm run dev'."
    )
  }

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'La génération a échoué. Réessayez.')
  }

  return donnees.exercices
}

export async function listerExercices() {
  const { data, error } = await supabase.from('exercices').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenirExercice(id) {
  const { data, error } = await supabase.from('exercices').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function creerExercice(exercice) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('exercices')
    .insert({ ...exercice, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function modifierExercice(id, changements) {
  const { data, error } = await supabase
    .from('exercices')
    .update({ ...changements, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function supprimerExercice(id) {
  const { error } = await supabase.from('exercices').delete().eq('id', id)
  if (error) throw error
}
