// Fonction serverless Netlify : reçoit les webhooks FedaPay et active/désactive l'abonnement
// correspondant dans Supabase. Appelée par les serveurs FedaPay, pas par le navigateur.
//
// À configurer dans le tableau de bord FedaPay : URL du webhook =
// https://<ton-domaine>/.netlify/functions/fedapay-webhook  (ou /api/fedapay-webhook)
//
// Note : le format exact de l'en-tête de signature et de la charge utile peut varier selon
// la version d'API FedaPay. Vérifie dans la doc/dashboard FedaPay avant la mise en production,
// et teste d'abord en sandbox (FEDAPAY_ENV=sandbox).

import crypto from 'crypto'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return reponse(405, { erreur: 'Méthode non autorisée.' })
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FEDAPAY_WEBHOOK_SECRET } = process.env

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FEDAPAY_WEBHOOK_SECRET) {
    console.error("Variables d'environnement manquantes sur la fonction fedapay-webhook.")
    return reponse(500, { erreur: 'Configuration serveur incomplète.' })
  }

  const rawBody = event.body || ''
  const signatureHeader = event.headers['x-fedapay-signature'] || event.headers['X-FEDAPAY-SIGNATURE']

  if (!signatureHeader || !verifierSignature(rawBody, signatureHeader, FEDAPAY_WEBHOOK_SECRET)) {
    console.error('Webhook FedaPay rejeté : signature manquante ou invalide.')
    return reponse(401, { erreur: 'Signature invalide.' })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return reponse(400, { erreur: 'Corps de requête invalide.' })
  }

  const nomEvenement = payload.name || payload.event
  const entite = payload.entity || payload.data || {}
  const transactionId = entite.id ? String(entite.id) : null
  const statutFedapay = String(entite.status || '').toLowerCase()
  const metadata = entite.custom_metadata || {}

  if (!transactionId) {
    console.error('Webhook FedaPay sans id de transaction:', JSON.stringify(payload))
    return reponse(200, { ignore: true })
  }

  const estApprouve =
    statutFedapay === 'approved' || statutFedapay === 'completed' || nomEvenement === 'transaction.approved'
  const estEchoue =
    statutFedapay === 'declined' ||
    statutFedapay === 'canceled' ||
    nomEvenement === 'transaction.declined' ||
    nomEvenement === 'transaction.canceled'

  if (!estApprouve && !estEchoue) {
    // Autre type d'événement (ex: transaction.created, transaction.transferred) : rien à faire.
    return reponse(200, { ignore: true })
  }

  const maintenant = new Date()
  const dansUnMois = new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000)

  const champsMiseAJour = estApprouve
    ? {
        statut: 'actif',
        periode_debut: maintenant.toISOString(),
        periode_fin: dansUnMois.toISOString(),
        updated_at: maintenant.toISOString()
      }
    : { statut: 'echoue', updated_at: maintenant.toISOString() }

  try {
    const miseAJour = await fetch(
      `${SUPABASE_URL}/rest/v1/abonnements?fedapay_transaction_id=eq.${encodeURIComponent(transactionId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=representation'
        },
        body: JSON.stringify(champsMiseAJour)
      }
    )

    const lignesMisesAJour = miseAJour.ok ? await miseAJour.json() : []

    // Filet de sécurité : si aucune ligne "en_attente" ne correspondait (insertion initiale ratée),
    // on la crée directement grâce aux custom_metadata envoyées à la création de la transaction.
    if (estApprouve && Array.isArray(lignesMisesAJour) && lignesMisesAJour.length === 0) {
      if (metadata.user_id && metadata.niveau) {
        await fetch(`${SUPABASE_URL}/rest/v1/abonnements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({
            user_id: metadata.user_id,
            niveau: metadata.niveau,
            montant: metadata.niveau === 'primaire' ? 2000 : 3000,
            statut: 'actif',
            fedapay_transaction_id: transactionId,
            periode_debut: maintenant.toISOString(),
            periode_fin: dansUnMois.toISOString()
          })
        })
      } else {
        console.error(
          'Webhook FedaPay approuvé sans ligne correspondante et sans metadata exploitable:',
          transactionId
        )
      }
    }

    // Mémorise le niveau choisi sur le profil enseignant une fois l'abonnement confirmé.
    if (estApprouve && metadata.user_id && metadata.niveau) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(metadata.user_id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ niveau_enseignement: metadata.niveau })
      })
    }
  } catch (err) {
    console.error('Erreur mise à jour Supabase depuis webhook FedaPay:', err)
    return reponse(500, { erreur: 'Erreur interne.' })
  }

  return reponse(200, { recu: true })
}

function verifierSignature(rawBody, signatureHeader, secret) {
  try {
    const parties = Object.fromEntries(signatureHeader.split(',').map((partie) => partie.trim().split('=')))
    const timestamp = parties.t
    const signatureAttendue = parties.s
    if (!timestamp || !signatureAttendue) return false

    const signatureCalculee = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')

    const bufA = Buffer.from(signatureCalculee)
    const bufB = Buffer.from(signatureAttendue)
    if (bufA.length !== bufB.length) return false

    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

function reponse(statusCode, corps) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }
}
