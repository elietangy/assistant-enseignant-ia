import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChargement(false)
    })

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, nouvelleSession) => {
      setSession(nouvelleSession)
    })

    return () => abonnement.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    utilisateur: session?.user ?? null,
    chargement,
    inscription: (email, motDePasse, nomComplet) =>
      supabase.auth.signUp({
        email,
        password: motDePasse,
        options: { data: { nom_complet: nomComplet } }
      }),
    connexion: (email, motDePasse) => supabase.auth.signInWithPassword({ email, password: motDePasse }),
    deconnexion: () => supabase.auth.signOut()
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexte = useContext(AuthContext)
  if (!contexte) throw new Error('useAuth doit être utilisé à l\'intérieur de AuthProvider')
  return contexte
}
