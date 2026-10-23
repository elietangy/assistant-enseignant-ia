// Vérifie qu'une requête vient d'un utilisateur connecté ET qui a accès à l'appli
// (abonnement actif).
// Utilisé par toutes les fonctions de génération IA pour éviter qu'un appel direct
// à l'API (en dehors du site) ne permette de générer du contenu gratuitement.

export async function verifierAcces({ accessToken, SUPABASE_URL, SUPABASE_ANON_KEY }) {
  const reponseUtilisateur = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY }
  })

  if (!reponseUtilisateur.ok) {
    return { autorise: false, motif: 'session', utilisateur: null }
  }

  const utilisateur = await reponseUtilisateur.json()

  // Les administrateurs (table public.admins) ont toujours accès.
  const reponseAdmin = await fetch(
    `${SUPABASE_URL}/rest/v1/admins?select=user_id&user_id=eq.${encodeURIComponent(utilisateur.id)}&limit=1`,
    { headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY } }
  )
  if (reponseAdmin.ok) {
    const admins = await reponseAdmin.json()
    if (Array.isArray(admins) && admins.length > 0) {
      return { autorise: true, motif: 'admin', utilisateur }
    }
  }

  // Sinon, il faut un abonnement actif.
  const reponseAbonnement = await fetch(
    `${SUPABASE_URL}/rest/v1/abonnements?select=id&user_id=eq.${encodeURIComponent(utilisateur.id)}&statut=eq.actif&periode_fin=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`,
    { headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY } }
  )

  if (reponseAbonnement.ok) {
    const lignes = await reponseAbonnement.json()
    if (Array.isArray(lignes) && lignes.length > 0) {
      return { autorise: true, motif: 'abonnement', utilisateur }
    }
  }

  return { autorise: false, motif: 'paiement_requis', utilisateur }
}
