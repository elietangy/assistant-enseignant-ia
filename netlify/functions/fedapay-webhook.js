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

  // Pour la récompense de parrainage : savoir si cette transaction active vraiment un
  // abonnement pour la première fois (et pas un simple rejeu de webhook déjà traité).
  let etaitDejaActif = false
  if (estApprouve) {
    try {
      const reponseAvant = await fetch(
        `${SUPABASE_URL}/rest/v1/abonnements?select=statut&fedapay_transaction_id=eq.${encodeURIComponent(transactionId)}&limit=1`,
        { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
      )
      if (reponseAvant.ok) {
        const lignesAvant = await reponseAvant.json()
        etaitDejaActif = lignesAvant[0]?.statut === 'actif'
      }
    } catch (err) {
      console.error('Erreur lecture statut avant mise à jour (parrainage):', err)
    }
  }

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

    // Récompense du parrain : seulement au tout premier paiement réussi du filleul,
    // jamais sur un rejeu de webhook pour la même transaction.
    if (estApprouve && !etaitDejaActif && metadata.user_id) {
      await recompenserParrainSiPremierPaiement({
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        userId: metadata.user_id,
        transactionId,
        maintenant
      })
    }
  } catch (err) {
    console.error('Erreur mise à jour Supabase depuis webhook FedaPay:', err)
    return reponse(500, { erreur: 'Erreur interne.' })
  }

  return reponse(200, { recu: true })
}

// Reproduit l'algorithme du SDK officiel FedaPay (classe WebhookSignature) : l'en-tête
// x-fedapay-signature est "t=<timestamp>,s=<hmac_hex>" (potentiellement plusieurs "s="),
// et le HMAC porte sur "<timestamp>.<corpsBrut>", pas sur le corps seul.
const TOLERANCE_SIGNATURE_SECONDES = 300 // 5 minutes, comme le SDK FedaPay

function verifierSignature(rawBody, signatureHeader, secret, tolerance = TOLERANCE_SIGNATURE_SECONDES) {
  if (typeof signatureHeader !== 'string' || !signatureHeader) return false

  const details = signatureHeader.split(',').reduce(
    (accum, item) => {
      const [cle, valeur] = item.trim().split('=')
      if (cle === 't') accum.timestamp = parseInt(valeur, 10)
      if (cle === 's' && valeur) accum.signatures.push(valeur)
      return accum
    },
    { timestamp: -1, signatures: [] }
  )

  if (details.timestamp === -1 || Number.isNaN(details.timestamp) || details.signatures.length === 0) {
    return false
  }

  const ageSignature = Math.floor(Date.now() / 1000) - details.timestamp
  if (ageSignature > tolerance) return false

  const signatureAttendue = crypto.createHmac('sha256', secret).update(`${details.timestamp}.${rawBody}`).digest('hex')
  const bufferAttendu = Buffer.from(signatureAttendue, 'hex')

  return details.signatures.some((signatureRecue) => {
    try {
      const bufferRecu = Buffer.from(signatureRecue, 'hex')
      return bufferRecu.length === bufferAttendu.length && crypto.timingSafeEqual(bufferRecu, bufferAttendu)
    } catch {
      return false
    }
  })
}

// Accorde 30 jours gratuits au parrain quand son filleul effectue son tout premier
// paiement réussi (jamais à l'inscription, pour éviter les faux comptes créés juste
// pour générer des récompenses).
async function recompenserParrainSiPremierPaiement({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, userId, transactionId, maintenant }) {
  const enTeteService = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }

  try {
    // Est-ce le premier abonnement actif de ce filleul ?
    const reponseCompte = await fetch(
      `${SUPABASE_URL}/rest/v1/abonnements?select=id&user_id=eq.${encodeURIComponent(userId)}&statut=eq.actif`,
      { headers: enTeteService }
    )
    if (!reponseCompte.ok) return
    const abonnementsActifs = await reponseCompte.json()
    if (abonnementsActifs.length !== 1) return // déjà abonné avant, ou anomalie : pas de récompense

    // Ce filleul a-t-il un parrain ?
    const reponseProfil = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=parraine_par&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: enTeteService }
    )
    if (!reponseProfil.ok) return
    const profil = (await reponseProfil.json())[0]
    const parrainId = profil?.parraine_par
    if (!parrainId) return

    // Abonnement actif existant du parrain, s'il y en a un, pour prolonger plutôt qu'écraser.
    const reponseAboParrain = await fetch(
      `${SUPABASE_URL}/rest/v1/abonnements?select=id,periode_fin&user_id=eq.${encodeURIComponent(parrainId)}&statut=eq.actif&order=periode_fin.desc&limit=1`,
      { headers: enTeteService }
    )
    const abosParrain = reponseAboParrain.ok ? await reponseAboParrain.json() : []
    const existant = abosParrain[0]

    const basePourExtension =
      existant && new Date(existant.periode_fin) > maintenant ? new Date(existant.periode_fin) : maintenant
    const nouvellePeriodeFin = new Date(basePourExtension.getTime() + 30 * 24 * 60 * 60 * 1000)

    if (existant) {
      await fetch(`${SUPABASE_URL}/rest/v1/abonnements?id=eq.${encodeURIComponent(existant.id)}`, {
        method: 'PATCH',
        headers: { ...enTeteService, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ periode_fin: nouvellePeriodeFin.toISOString(), updated_at: maintenant.toISOString() })
      })
    } else {
      const reponseProfilParrain = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=niveau_enseignement&id=eq.${encodeURIComponent(parrainId)}&limit=1`,
        { headers: enTeteService }
      )
      const niveauParrain = (reponseProfilParrain.ok ? (await reponseProfilParrain.json())[0] : null)?.niveau_enseignement || 'primaire'

      await fetch(`${SUPABASE_URL}/rest/v1/abonnements`, {
        method: 'POST',
        headers: { ...enTeteService, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: parrainId,
          niveau: niveauParrain,
          montant: 0,
          statut: 'actif',
          fedapay_transaction_id: `parrainage_${transactionId}`,
          periode_debut: maintenant.toISOString(),
          periode_fin: nouvellePeriodeFin.toISOString()
        })
      })
    }
  } catch (err) {
    console.error('Erreur récompense parrainage:', err)
  }
}

function reponse(statusCode, corps) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }
}
