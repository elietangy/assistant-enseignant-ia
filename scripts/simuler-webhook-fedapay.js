// ============================================================
// Simule un vrai webhook FedaPay (transaction.approved) envoyé vers la prod,
// avec une signature HMAC valide, SANS jamais appeler l'API FedaPay.
// Sert à valider fedapay-webhook.js indépendamment de tout accès à FedaPay.
//
// Prérequis : FEDAPAY_WEBHOOK_SECRET doit être dans l'environnement de CE
// terminal (jamais transmis à Claude). Exemple :
//   FEDAPAY_WEBHOOK_SECRET=... node scripts/simuler-webhook-fedapay.js <user_id_uuid> <primaire|secondaire>
//
// user_id_uuid : l'id d'un utilisateur existant (Supabase > Authentication > Users)
// ============================================================
const crypto = require('crypto')

const URL_WEBHOOK = process.env.URL_WEBHOOK_TEST || 'https://assistantenseignant.site/.netlify/functions/fedapay-webhook'

const secret = process.env.FEDAPAY_WEBHOOK_SECRET
if (!secret) {
  console.error("FEDAPAY_WEBHOOK_SECRET n'est pas défini dans ce terminal. Voir les commentaires en haut du fichier.")
  process.exit(1)
}

const userId = process.argv[2]
const niveau = process.argv[3]

if (!userId || !['primaire', 'secondaire'].includes(niveau)) {
  console.error('Usage : node scripts/simuler-webhook-fedapay.js <user_id_uuid> <primaire|secondaire>')
  process.exit(1)
}

const transactionIdTest = Date.now() // entier unique à chaque run

const payload = {
  name: 'transaction.approved',
  entity: {
    id: transactionIdTest,
    status: 'approved',
    amount: niveau === 'primaire' ? 2000 : 3000,
    mode: 'mtn_open',
    custom_metadata: { user_id: userId, niveau }
  }
}
const corpsBrut = JSON.stringify(payload)

// Format réel FedaPay : "t=<timestamp>,s=<hmac_hex>", HMAC calculé sur
// "<timestamp>.<corpsBrut>", pas sur le corps seul.
const timestamp = Math.floor(Date.now() / 1000)
const signatureHex = crypto.createHmac('sha256', secret).update(`${timestamp}.${corpsBrut}`, 'utf8').digest('hex')
const enteteSignature = `t=${timestamp},s=${signatureHex}`

console.log('Payload envoyé :', corpsBrut)
console.log('En-tête signature :', enteteSignature)

fetch(URL_WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-fedapay-signature': enteteSignature },
  body: corpsBrut
})
  .then(async (reponse) => {
    console.log('\nStatut HTTP :', reponse.status)
    console.log('Corps de la réponse :', await reponse.text())
    console.log(
      '\nSi "recu: true" ci-dessus : va vérifier dans Supabase (table abonnements) qu\'une ligne "actif" a été créée pour cet user_id, et que /abonnement affiche bien l\'abonnement actif.'
    )
  })
  .catch((erreur) => {
    console.error('Erreur réseau :', erreur)
  })
