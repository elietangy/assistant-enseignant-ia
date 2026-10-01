import { supabase } from '../supabaseClient'

export const TARIFS = { primaire: 2000, secondaire: 3000 }
export const JOURS_ESSAI_GRATUIT = 7

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

// Statut d'accès global : abonnement payant actif, ou essai gratuit des 7 premiers
// jours suivant l'inscription (basé sur la date de création du compte Supabase).
export async function obtenirStatutAcces() {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return { actif: false, source: null, abonnement: null, joursRestantsEssai: 0 }

  const abonnement = await obtenirAbonnementActif()
  if (abonnement) {
    return { actif: true, source: 'abonnement', abonnement, joursRestantsEssai: 0 }
  }

  if (user.created_at) {
    const finEssai = new Date(user.created_at).getTime() + JOURS_ESSAI_GRATUIT * 24 * 60 * 60 * 1000
    const maintenant = Date.now()
    if (maintenant < finEssai) {
      const joursRestants = Math.max(1, Math.ceil((finEssai - maintenant) / (24 * 60 * 60 * 1000)))
      return { actif: true, source: 'essai', abonnement: null, joursRestantsEssai: joursRestants }
    }
  }

  return { actif: false, source: null, abonnement: null, joursRestantsEssai: 0 }
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
