// Fonction serverless Netlify : génère une série d'exercices/devoirs (avec corrigés) via OpenAI.

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

  const { accessToken, cycle, classe, matiere, theme, nombreExercices } = payload

  if (!accessToken || !cycle || !classe || !matiere || !theme) {
    return reponse(400, { erreur: 'Merci de renseigner le cycle, la classe, la matière et le thème.' })
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY } = process.env

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
    console.error("Variables d'environnement manquantes sur la fonction generate-exercices.")
    return reponse(500, { erreur: 'Configuration serveur incomplète. Contactez le support.' })
  }

  let utilisateurValide
  try {
    const reponseUtilisateur = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_ANON_KEY }
    })
    utilisateurValide = reponseUtilisateur.ok
  } catch (err) {
    console.error('Erreur de vérification de session:', err)
    return reponse(502, { erreur: 'Impossible de vérifier votre session. Réessayez.' })
  }

  if (!utilisateurValide) {
    return reponse(401, { erreur: 'Session expirée, merci de vous reconnecter.' })
  }

  const nombre = Number(nombreExercices) > 0 ? Number(nombreExercices) : 5

  const promptSysteme = "Tu es un conseiller pédagogique expérimenté qui aide les enseignants du primaire, du collège et du lycée en Afrique de l'Ouest francophone à préparer des exercices et devoirs pour leurs élèves. Tu t'appuies strictement sur le programme scolaire officiel en vigueur dans les pays d'Afrique de l'Ouest francophone (Bénin, Togo, Côte d'Ivoire, Sénégal, Burkina Faso, Mali, Niger, Guinée), fondé sur l'Approche Par Compétences (APC) : les exercices doivent mobiliser les compétences visées par le programme pour ce niveau et ce thème, et les mises en situation doivent être ancrées dans le contexte de vie ouest-africain (objets, monnaie, prénoms, réalités locales). Réponds toujours en français, avec des exercices clairs, gradués en difficulté, et directement utilisables en classe ou à la maison."

  const promptUtilisateur = `Prépare une série de ${nombre} exercices (avec leur corrigé) pour :
- Cycle : ${cycle}
- Classe : ${classe}
- Matière : ${matiere}
- Thème : ${theme}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme exacte :
{
  "titre": "titre court de la série d'exercices",
  "consignes": "consigne générale donnée aux élèves",
  "exercices": [
    { "enonce": "énoncé complet de l'exercice 1", "corrige": "corrigé détaillé de l'exercice 1" }
  ]
}
Les exercices doivent aller du plus simple au plus difficile.`

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
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
      return reponse(502, { erreur: 'Réponse IA vide, réessayez.' })
    }

    const exercices = JSON.parse(contenu)
    return reponse(200, { exercices })
  } catch (err) {
    console.error('Erreur génération exercices:', err)
    return reponse(500, { erreur: 'Erreur interne lors de la génération. Réessayez.' })
  }
}

function reponse(statusCode, corps) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }
}
