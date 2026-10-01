// Fonction serverless Netlify : enregistre qu'un utilisateur a été parrainé par le
// propriétaire d'un code de parrainage. Appelée une seule fois, juste après la
// première connexion d'un compte arrivé via un lien ?ref=CODE.
//
// Utilise la clé service_role car la recherche d'un profil par code de parrainage
// doit fonctionner même si ce profil n'est pas le sien (RLS ne l'autoriserait pas).

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return reponse(405, { erreur: 'Méthode non autorisée.' })
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return reponse(400, { erreur: 'Corps de requête invalide.' })
  }

  const { accessToken, codeParrainage } = payload

  if (!accessToken || !codeParrainage) {
    return reponse(400, { erreur: 'Code de parrainage manquant.' })
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Variables d'environnement manquantes sur la fonction appliquer-parrainage.")
    return reponse(500, { erreur: 'Configuration serveur incomplète.' })
  }

  let utilisateur
  try {
    const reponseUtilisateur = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY }
    })
    if (!reponseUtilisateur.ok) throw new Error('session invalide')
    utilisateur = await reponseUtilisateur.json()
  } catch (err) {
    console.error('Erreur de vérification de session:', err)
    return reponse(401, { erreur: 'Session expirée, merci de vous reconnecter.' })
  }

  const code = String(codeParrainage).trim().toUpperCase()

  try {
    // 1. Trouver le parrain propriétaire de ce code
    const reponseParrain = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,code_parrainage&code_parrainage=eq.${encodeURIComponent(code)}&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    )
    if (!reponseParrain.ok) throw new Error('recherche du parrain échouée')
    const parrains = await reponseParrain.json()
    const parrain = parrains[0]

    if (!parrain || parrain.id === utilisateur.id) {
      // Code invalide, ou l'utilisateur essaie de se parrainer lui-même : on ignore silencieusement.
      return reponse(200, { applique: false })
    }

    // 2. Rattacher ce filleul au parrain, seulement s'il n'a pas déjà de parrain
    const reponseMaj = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(utilisateur.id)}&parraine_par=is.null`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ parraine_par: parrain.id })
      }
    )

    if (!reponseMaj.ok) throw new Error('mise à jour du parrainage échouée')
    const lignes = await reponseMaj.json()

    return reponse(200, { applique: Array.isArray(lignes) && lignes.length > 0 })
  } catch (err) {
    console.error('Erreur application parrainage:', err)
    return reponse(500, { erreur: 'Erreur interne.' })
  }
}

function reponse(statusCode, corps) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }
}
