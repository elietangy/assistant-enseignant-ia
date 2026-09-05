import { supabase } from '../supabaseClient'

export const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

export async function listerCreneaux() {
  const { data, error } = await supabase
    .from('emploi_du_temps')
    .select('*')
    .order('heure_debut', { ascending: true })

  if (error) throw error
  return data
}

export async function creerCreneau(creneau) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('emploi_du_temps')
    .insert({ ...creneau, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function supprimerCreneau(id) {
  const { error } = await supabase.from('emploi_du_temps').delete().eq('id', id)
  if (error) throw error
}
