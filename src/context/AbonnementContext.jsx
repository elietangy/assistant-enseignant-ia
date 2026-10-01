import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { obtenirAbonnementActif } from '../lib/abonnementApi'

const AbonnementContext = createContext(null)

export function AbonnementProvider({ children }) {
  const { session } = useAuth()
  const [abonnement, setAbonnement] = useState(null)
  const [chargement, setChargement] = useState(true)

  const rafraichir = useCallback(async () => {
    if (!session) {
      setAbonnement(null)
      setChargement(false)
      return
    }
    setChargement(true)
    try {
      const actif = await obtenirAbonnementActif()
      setAbonnement(actif)
    } finally {
      setChargement(false)
    }
  }, [session])

  useEffect(() => {
    rafraichir()
  }, [rafraichir])

  const value = {
    abonnementActif: !!abonnement,
    abonnement,
    chargementAbonnement: chargement,
    rafraichirAbonnement: rafraichir
  }

  return <AbonnementContext.Provider value={value}>{children}</AbonnementContext.Provider>
}

export function useAbonnement() {
  const contexte = useContext(AbonnementContext)
  if (!contexte) throw new Error("useAbonnement doit être utilisé à l'intérieur de AbonnementProvider")
  return contexte
}
