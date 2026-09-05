// Fonction serverless Netlify : génère une fiche d'évaluation (interrogation/devoir/examen) avec barème, via OpenAI.

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

  const { accessToken, cycle, classe, matiere, themes, typeEvaluation, dureeMinutes, baremeTotal } = payload

  if (!accessToken || !cycle || !classe || !matiere || !themes) {
    return reponse(400, { erreur: 'Merci de renseigner le cycle, la classe, la matière et les thèmes couverts.' })
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY } = process.env

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
    console.error("Variables d'environnement manquantes sur la fonction generate-evaluation.")
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

  const type = typeEvaluation || 'interrogation'
  const duree = Number(dureeMinutes) > 0 ? Number(dureeMinutes) : 55
  const bareme = Number(baremeTotal) > 0 ? Number(baremeTotal) : 20

  const promptSysteme = "Tu es un conseiller pédagogique expérimenté qui aide les enseignants du primaire, du collège et du lycée en Afrique de l'Ouest francophone à préparer des évaluations notées (interrogations, devoirs, examens). Tu t'appuies strictement sur le programme scolaire officiel en vigueur dans les pays d'Afrique de l'Ouest francophone (Bénin, Togo, Côte d'Ivoire, Sénégal, Burkina Faso, Mali, Niger, Guinée), fondé sur l'Approche Par Compétences (APC) : les questions doivent évaluer les compétences attendues par le programme pour ce niveau, dans un format proche des épreuves officielles (CEP, BEPC, BAC selon le niveau), et les mises en situation doivent être ancrées dans le contexte de vie ouest-africain. Réponds toujours en français, avec un barème cohérent qui totalise exactement le nombre de points demandé."

  const promptUtilisateur = `Prépare une évaluation de type "${type}" pour :
- Cycle : ${cycle}
- Classe : ${classe}
- Matière : ${matiere}
- Thèmes couverts : ${themes}
- Durée : ${duree} minutes
- Barème total : ${bareme} points

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme exacte :
{
  "titre": "titre de l'évaluation",
  "consignes": "consignes générales données aux élèves (matériel autorisé, présentation attendue, etc.)",
  "exercices": [
    { "enonce": "énoncé complet de la question/exercice", "bareme": "X points", "corrige": "corrigé détaillé avec répartition des points" }
  ]
}
La somme des points de "bareme" sur tous les exercices doit être égale à ${bareme}.`

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

    const evaluation = JSON.parse(contenu)
    return reponse(200, { evaluation })
  } catch (err) {
    console.error('Erreur génération évaluation:', err)
    return reponse(500, { erreur: 'Erreur interne lors de la génération. Réessayez.' })
  }
}

function reponse(statusCode, corps) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }
}
