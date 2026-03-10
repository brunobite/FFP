import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { UserProfile } from '@/types/database'
import { ensureInitialFamilyBootstrap, getUserProfile } from '@/services/firestore/family'
import {
  clearSession,
  loadSession,
  refreshSession,
  sendPasswordReset,
  signInWithEmail,
  signUpWithEmail,
  type AuthUser,
} from '@/services/firebase'

interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  isLoading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const hydrateProfile = useCallback(async (authUser: AuthUser) => {
    try {
      await ensureInitialFamilyBootstrap({ uid: authUser.uid, email: authUser.email, displayName: authUser.displayName })
      const data = await getUserProfile(authUser.uid)
      setProfile(data)
    } catch (error) {
      console.error('[firestore][auth] falha no bootstrap do perfil/família (não bloqueante)', error)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    const bootstrapSession = async () => {
      const saved = loadSession()
      if (!saved) {
        setIsLoading(false)
        return
      }

      try {
        const currentUser = await refreshSession(saved)
        setUser(currentUser)
        await hydrateProfile(currentUser)
      } catch (error) {
        console.warn('[auth] sessão não pôde ser restaurada', error)
        clearSession()
        setUser(null)
        setProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrapSession()
  }, [hydrateProfile])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const account = await signUpWithEmail(email, password, fullName)
      setUser(account)
      await hydrateProfile(account)
    },
    [hydrateProfile],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      const account = await signInWithEmail(email, password)
      setUser(account)
      await hydrateProfile(account)
    },
    [hydrateProfile],
  )

  const signOut = useCallback(async () => {
    clearSession()
    setUser(null)
    setProfile(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordReset(email)
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}
