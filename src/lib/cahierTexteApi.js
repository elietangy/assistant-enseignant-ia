import { supabase } from '../supabaseClient'

export async function listerCahierTexte() {
  const { data, error } = await supabase
    .from('cahier_texte')
    .select('*')
    .order('date_cours', { ascending: false })

  if (error) throw error
  return data
}

export async function creerEntreeCahierTexte(entree) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('cahier_texte')
    .insert({ ...entree, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function supprimerEntreeCahierTexte(id) {
  const { error } = await supabase.from('cahier_texte').delete().eq('id', id)
  if (error) throw error
}
