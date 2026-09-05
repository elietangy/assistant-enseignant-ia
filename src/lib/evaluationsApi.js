import { supabase } from '../supabaseClient'

export async function genererEvaluationAvecIA({
  cycle,
  classe,
  matiere,
  themes,
  typeEvaluation,
  dureeMinutes,
  baremeTotal,
  accessToken
}) {
  const reponse = await fetch('/api/generate-evaluation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle, classe, matiere, themes, typeEvaluation, dureeMinutes, baremeTotal, accessToken })
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

  return donnees.evaluation
}

export async function listerEvaluations() {
  const { data, error } = await supabase.from('evaluations').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenirEvaluation(id) {
  const { data, error } = await supabase.from('evaluations').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function creerEvaluation(evaluation) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('evaluations')
    .insert({ ...evaluation, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function modifierEvaluation(id, changements) {
  const { data, error } = await supabase
    .from('evaluations')
    .update({ ...changements, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function supprimerEvaluation(id) {
  const { error } = await supabase.from('evaluations').delete().eq('id', id)
  if (error) throw error
}
