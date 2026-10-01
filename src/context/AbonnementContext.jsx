import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { obtenirStatutAcces } from '../lib/abonnementApi'

const AbonnementContext = createContext(null)

const STATUT_INITIAL = { actif: false, source: null, abonnement: null, joursRestantsEssai: 0 }

export function AbonnementProvider({ children }) {
  const { session } = useAuth()
  const [statut, setStatut] = useState(STATUT_INITIAL)
  const [chargement, setChargement] = useState(true)

  const rafraichir = useCallback(async () => {
    if (!session) {
      setStatut(STATUT_INITIAL)
      setChargement(false)
      return
    }
    setChargement(true)
    try {
      const resultat = await obtenirStatutAcces()
      setStatut(resultat)
    } finally {
      setChargement(false)
    }
  }, [session])

  useEffect(() => {
    rafraichir()
  }, [rafraichir])

  const value = {
    abonnementActif: statut.actif,
    enEssaiGratuit: statut.source === 'essai',
    joursRestantsEssai: statut.joursRestantsEssai,
    abonnement: statut.abonnement,
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
