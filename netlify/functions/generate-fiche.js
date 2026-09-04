// Fonction serverless Netlify : génère une fiche de préparation de cours via OpenAI.
// La clé OpenAI reste ici, côté serveur, et n'est jamais exposée au navigateur.

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

  const { accessToken, cycle, classe, matiere, theme, dureeMinutes } = payload

  if (!accessToken || !cycle || !classe || !matiere || !theme) {
    return reponse(400, { erreur: 'Merci de renseigner le cycle, la classe, la matière et le thème du cours.' })
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY } = process.env

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
    console.error('Variables d\'environnement manquantes sur la fonction generate-fiche.')
    return reponse(500, { erreur: 'Configuration serveur incomplète. Contactez le support.' })
  }

  // 1. Vérifier que la requête vient bien d'un utilisateur connecté (protège le coût de l'API IA)
  let utilisateurValide
  try {
    const reponseUtilisateur = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY
      }
    })
    utilisateurValide = reponseUtilisateur.ok
  } catch (err) {
    console.error('Erreur de vérification de session:', err)
    return reponse(502, { erreur: 'Impossible de vérifier votre session. Réessayez.' })
  }

  if (!utilisateurValide) {
    return reponse(401, { erreur: 'Session expirée, merci de vous reconnecter.' })
  }

  // 2. Construire le prompt et appeler OpenAI
  const dureeTexte = dureeMinutes ? `${dureeMinutes} minutes` : '55 minutes'

  const promptSysteme = "Tu es un conseiller pédagogique expérimenté qui aide les enseignants du primaire, du collège et du lycée en Afrique francophone à préparer leurs fiches de cours. Réponds toujours en français, de façon claire, concrète et directement utilisable en classe, en tenant compte de moyens souvent limités (peu de matériel, grands effectifs, peu de temps de préparation)."

  const promptUtilisateur = `Prépare une fiche de préparation de cours structurée pour :
- Cycle : ${cycle}
- Classe : ${classe}
- Matière : ${matiere}
- Thème du cours : ${theme}
- Durée prévue : ${dureeTexte}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme exacte :
{
  "objectifs": ["objectif pédagogique 1", "objectif pédagogique 2"],
  "deroulement": [
    { "etape": "Introduction / mise en situation", "duree": "5 min", "activite": "description concrète de ce que fait l'enseignant et les élèves" },
    { "etape": "Développement", "duree": "30 min", "activite": "..." },
    { "etape": "Application / exercices", "duree": "15 min", "activite": "..." },
    { "etape": "Conclusion / synthèse", "duree": "5 min", "activite": "..." }
  ],
  "materiel": "liste du matériel nécessaire, séparée par des virgules",
  "evaluation": "modalité d'évaluation proposée pour vérifier l'acquisition des objectifs"
}`

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: promptSysteme },
          { role: 'user', content: promptUtilisateur }
        ]
      })
    })

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text()
      console.error('Erreur OpenAI:', detail)
      return reponse(502, { erreur: 'La génération IA a échoué. Réessayez dans un instant.' })
    }

    const donnees = await openaiResponse.json()
    const contenu = donnees.choices?.[0]?.message?.content

    if (!contenu) {
      return reponse(502, { erreur: "Réponse IA vide, réessayez." })
    }

    const fiche = JSON.parse(contenu)
    return reponse(200, { fiche })
  } catch (err) {
    console.error('Erreur génération fiche:', err)
    return reponse(500, { erreur: 'Erreur interne lors de la génération. Réessayez.' })
  }
}

function reponse(statusCode, corps) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps)
  }
}
