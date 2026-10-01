// Fonction serverless Netlify : crée une transaction FedaPay pour l'abonnement mensuel
// (2000 FCFA primaire / 3000 FCFA secondaire) et renvoie l'URL de paiement hébergée.

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

  const { accessToken, niveau } = payload

  if (!accessToken || !['primaire', 'secondaire'].includes(niveau)) {
    return reponse(400, { erreur: "Merci de préciser le niveau d'enseignement (primaire ou secondaire)." })
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, FEDAPAY_SECRET_KEY, FEDAPAY_ENV, SITE_URL } = process.env

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !FEDAPAY_SECRET_KEY) {
    console.error("Variables d'environnement manquantes sur la fonction fedapay-create-transaction.")
    return reponse(500, { erreur: 'Configuration serveur incomplète. Contactez le support.' })
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

  // Le montant est toujours calculé côté serveur à partir du niveau, jamais envoyé par le client.
  const montant = niveau === 'primaire' ? 2000 : 3000
  const nomComplet = (utilisateur.user_metadata?.nom_complet || '').trim()
  const [prenom, ...resteNom] = nomComplet.split(' ').filter(Boolean)

  const fedapayBase = FEDAPAY_ENV === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1'
  const siteUrl = (SITE_URL || 'https://assistantenseignant.site').replace(/\/$/, '')

  let transactionId
  try {
    const transactionResponse = await fetch(`${fedapayBase}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FEDAPAY_SECRET_KEY}` },
      body: JSON.stringify({
        description: `Abonnement mensuel Assistant Enseignant IA - ${niveau}`,
        amount: montant,
        currency: { iso: 'XOF' },
        callback_url: `${siteUrl}/abonnement?paiement=retour`,
        customer: {
          email: utilisateur.email,
          firstname: prenom || utilisateur.email,
          lastname: resteNom.join(' ') || '-'
        },
        custom_metadata: { user_id: utilisateur.id, niveau }
      })
    })

    if (!transactionResponse.ok) {
      const detail = await transactionResponse.text()
      console.error('Erreur création transaction FedaPay:', detail)
      return reponse(502, { erreur: 'Impossible de créer le paiement. Réessayez.' })
    }

    const donnees = await transactionResponse.json()
    transactionId = donnees['v1/transaction']?.id || donnees.id

    if (!transactionId) {
      console.error('Réponse FedaPay inattendue:', JSON.stringify(donnees))
      return reponse(502, { erreur: 'Réponse de paiement invalide. Réessayez.' })
    }
  } catch (err) {
    console.error('Erreur réseau FedaPay (création transaction):', err)
    return reponse(502, { erreur: 'Impossible de contacter le service de paiement. Réessayez.' })
  }

  let urlPaiement
  try {
    const tokenResponse = await fetch(`${fedapayBase}/transactions/${transactionId}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FEDAPAY_SECRET_KEY}` }
    })

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text()
      console.error('Erreur génération token FedaPay:', detail)
      return reponse(502, { erreur: 'Impossible de générer le lien de paiement. Réessayez.' })
    }

    const donneesToken = await tokenResponse.json()
    urlPaiement = donneesToken.url
    if (!urlPaiement) {
      console.error('Réponse token FedaPay inattendue:', JSON.stringify(donneesToken))
      return reponse(502, { erreur: 'Lien de paiement introuvable. Réessayez.' })
    }
  } catch (err) {
    console.error('Erreur réseau FedaPay (token):', err)
    return reponse(502, { erreur: 'Impossible de contacter le service de paiement. Réessayez.' })
  }

  // Enregistre la demande en attente (RLS : l'utilisateur ne peut insérer que pour lui-même).
  // Si ça échoue, le webhook saura quand même créer la ligne grâce aux custom_metadata.
  try {
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/abonnements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        user_id: utilisateur.id,
        niveau,
        montant,
        statut: 'en_attente',
        fedapay_transaction_id: String(transactionId)
      })
    })

    if (!insertResponse.ok) {
      const detail = await insertResponse.text()
      console.error('Erreur enregistrement abonnement en attente:', detail)
    }
  } catch (err) {
    console.error('Erreur réseau Supabase (insertion abonnement en attente):', err)
  }

  return reponse(200, { url: urlPaiement, transactionId })
}

function reponse(statusCode, corps) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }
}
