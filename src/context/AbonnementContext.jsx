import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { obtenirStatutAcces } from '../lib/abonnementApi'

const AbonnementContext = createContext(null)

const STATUT_INITIAL = { actif: false, source: null, abonnement: null }

export function AbonnementProvider({ children }) {
  const { session } = useAuth()
  const [statut, setStatut] = useState(STATUT_INITIAL)
  const [chargement, setChargement] = useState(true)
  const [statutPourUtilisateur, setStatutPourUtilisateur] = useState(null)

  const rafraichir = useCallback(async () => {
    if (!session) {
      setStatut(STATUT_INITIAL)
      setStatutPourUtilisateur(null)
      setChargement(false)
      return
    }
    setChargement(true)
    try {
      const resultat = await obtenirStatutAcces()
      setStatut(resultat)
    } finally {
      setStatutPourUtilisateur(session.user?.id ?? null)
      setChargement(false)
    }
  }, [session])

  useEffect(() => {
    rafraichir()
  }, [rafraichir])

  const value = {
    abonnementActif: statut.actif,
    estAdmin: statut.source === 'admin',
    abonnement: statut.abonnement,
    // Tant que le statut n'a pas été calculé pour l'utilisateur connecté, on reste en chargement
    // (évite une redirection vers /abonnement au premier affichage d'une page).
    chargementAbonnement: chargement || (!!session && statutPourUtilisateur !== (session.user?.id ?? null)),
    rafraichirAbonnement: rafraichir
  }

  return <AbonnementContext.Provider value={value}>{children}</AbonnementContext.Provider>
}

export function useAbonnement() {
  const contexte = useContext(AbonnementContext)
  if (!contexte) throw new Error("useAbonnement doit être utilisé à l'intérieur de AbonnementProvider")
  return contexte
}
