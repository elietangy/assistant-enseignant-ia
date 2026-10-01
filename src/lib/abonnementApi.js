import { supabase } from '../supabaseClient'

export const TARIFS = { primaire: 2000, secondaire: 3000 }

export async function obtenirAbonnementActif() {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('abonnements')
    .select('*')
    .eq('user_id', user.id)
    .eq('statut', 'actif')
    .gt('periode_fin', new Date().toISOString())
    .order('periode_fin', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data
}

export async function demarrerPaiementAbonnement(niveau) {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) throw new Error('Session expirée, merci de vous reconnecter.')

  const reponse = await fetch('/api/fedapay-create-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: session.access_token, niveau })
  })

  let donnees
  try {
    donnees = await reponse.json()
  } catch {
    throw new Error(
      "Impossible de contacter le service de paiement (réponse invalide). En local, utilisez 'netlify dev' plutôt que 'npm run dev'."
    )
  }

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Le paiement a échoué. Réessayez.')
  }

  return donnees
}
