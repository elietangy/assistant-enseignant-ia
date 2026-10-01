import { supabase } from '../supabaseClient'

const CLE_LOCALSTORAGE = 'pa_code_parrainage_en_attente'

export function memoriserCodeParrainageEnAttente(code) {
  if (!code) return
  try {
    localStorage.setItem(CLE_LOCALSTORAGE, code.trim().toUpperCase())
  } catch {
    // localStorage indisponible (navigation privée...) : on ignore, le parrainage sera juste perdu.
  }
}

// À appeler une fois qu'une session est active. Applique un éventuel code de
// parrainage mémorisé avant l'inscription (le compte n'existait pas encore
// au moment du clic sur le lien, donc on ne pouvait pas l'enregistrer avant).
export async function appliquerParrainageEnAttente() {
  let code
  try {
    code = localStorage.getItem(CLE_LOCALSTORAGE)
  } catch {
    return
  }
  if (!code) return

  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) return

  try {
    await fetch('/api/appliquer-parrainage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: session.access_token, codeParrainage: code })
    })
  } catch {
    // Pas grave si ça échoue : le parrainage est juste perdu pour cet utilisateur.
  } finally {
    try {
      localStorage.removeItem(CLE_LOCALSTORAGE)
    } catch {
      // ignore
    }
  }
}
