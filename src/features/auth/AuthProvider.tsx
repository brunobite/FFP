import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import type { UserProfile } from '@/types/database'
import { ensureInitialFamilyBootstrap, getUserProfile } from '@/services/firestore/family'
import { classifyFirestoreFailure, getFirestoreErrorCode, isFirestoreOfflineError } from '@/services/firestore/errors'
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
  isOffline: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  reloadProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

const MAX_OFFLINE_RETRIES = 3

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)

  const hydrateInFlight = useRef<Promise<void> | null>(null)
  const bootstrapCallCount = useRef(0)
  const retryAttempts = useRef(0)
  const retryTimer = useRef<number | null>(null)
  const activeUid = useRef<string | null>(null)
  const sessionBootstrapStarted = useRef(false)

  const clearRetryTimer = useCallback(() => {
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
  }, [])

  const resetRetryState = useCallback(() => {
    clearRetryTimer()
    retryAttempts.current = 0
  }, [clearRetryTimer])

  const hydrateProfile = useCallback(
    async (authUser: AuthUser, reason: 'bootstrap' | 'manual' | 'retry' = 'manual') => {
      if (hydrateInFlight.current) {
        console.info('[auth][bootstrap] reutilizando bootstrap em andamento', {
          uid: authUser.uid,
          reason,
          online: navigator.onLine,
          retries: retryAttempts.current,
        })
        return hydrateInFlight.current
      }

      const run = async () => {
        bootstrapCallCount.current += 1
        console.info('[auth][bootstrap] iniciado', {
          count: bootstrapCallCount.current,
          uid: authUser.uid,
          reason,
          online: navigator.onLine,
        })

        let hasOffline = false

        try {
          await ensureInitialFamilyBootstrap({ uid: authUser.uid, email: authUser.email, displayName: authUser.displayName })
        } catch (error) {
          if (isFirestoreOfflineError(error)) {
            hasOffline = true
            console.info('[firestore][auth] bootstrap remoto indisponível; fallback local mantido.', {
              uid: authUser.uid,
              online: navigator.onLine,
              source: 'cache',
              path: 'family bootstrap',
              code: getFirestoreErrorCode(error),
              diagnosis: classifyFirestoreFailure(error),
              reason: (error as { message?: string })?.message,
            })
          } else {
            console.error('[firestore][auth] falha no bootstrap do perfil/família (não bloqueante)', error)
          }
        }

        try {
          const data = await getUserProfile(authUser.uid)
          setProfile(data)

          if (!hasOffline) {
            setIsOffline(false)
            resetRetryState()
          }
        } catch (error) {
          if (isFirestoreOfflineError(error)) {
            hasOffline = true
            console.info('[firestore][auth] leitura de perfil indisponível por rede/offline; sem bloqueio de navegação.', {
              uid: authUser.uid,
              online: navigator.onLine,
              source: 'cache',
              path: `users/${authUser.uid}`,
              code: getFirestoreErrorCode(error),
              diagnosis: classifyFirestoreFailure(error),
              reason: (error as { message?: string })?.message,
            })
          } else {
            console.error('[firestore][auth] falha ao carregar perfil do usuário (não bloqueante)', error)
          }
          setProfile(null)
        }

        setIsOffline(hasOffline)
      }

      hydrateInFlight.current = run().finally(() => {
        hydrateInFlight.current = null
      })

      return hydrateInFlight.current
    },
    [resetRetryState],
  )

  useEffect(() => {
    if (sessionBootstrapStarted.current) return
    sessionBootstrapStarted.current = true

    const bootstrapSession = async () => {
      const saved = loadSession()
      if (!saved) {
        setIsLoading(false)
        return
      }

      try {
        const currentUser = await refreshSession(saved)
        activeUid.current = currentUser.uid
        setUser(currentUser)
        await hydrateProfile(currentUser, 'bootstrap')
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

  useEffect(() => {
    if (!user) {
      activeUid.current = null
      resetRetryState()
      return
    }

    if (activeUid.current !== user.uid) {
      activeUid.current = user.uid
      resetRetryState()
    }
  }, [user, resetRetryState])

  useEffect(() => {
    if (!isOffline || !user) {
      clearRetryTimer()
      return
    }

    const scheduleRetry = () => {
      if (retryTimer.current !== null) return
      if (retryAttempts.current >= MAX_OFFLINE_RETRIES) {
        console.warn(`[auth] limite de ${MAX_OFFLINE_RETRIES} tentativas de reconexão atingido; aguardando evento online.`, {
          uid: user.uid,
          online: navigator.onLine,
        })
        return
      }

      const attempt = retryAttempts.current + 1
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 15000)
      retryTimer.current = window.setTimeout(() => {
        retryTimer.current = null
        retryAttempts.current = attempt
        console.info(`[auth] tentativa de reconexão ${attempt}/${MAX_OFFLINE_RETRIES}`, {
          uid: user.uid,
          online: navigator.onLine,
        })
        void hydrateProfile(user, 'retry')
      }, delay)
    }

    const handleOnline = () => {
      console.info('[auth] conexão restabelecida — recarregando perfil.', {
        uid: user.uid,
        retries: retryAttempts.current,
      })
      resetRetryState()
      void hydrateProfile(user, 'retry')
    }

    if (navigator.onLine) {
      scheduleRetry()
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
      clearRetryTimer()
    }
  }, [clearRetryTimer, hydrateProfile, isOffline, resetRetryState, user])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const account = await signUpWithEmail(email, password, fullName)
      activeUid.current = account.uid
      setUser(account)
      await hydrateProfile(account)
    },
    [hydrateProfile],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      const account = await signInWithEmail(email, password)
      activeUid.current = account.uid
      setUser(account)
      await hydrateProfile(account)
    },
    [hydrateProfile],
  )

  const signOut = useCallback(async () => {
    clearSession()
    resetRetryState()
    setIsOffline(false)
    setUser(null)
    setProfile(null)
  }, [resetRetryState])

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordReset(email)
  }, [])

  const reloadProfile = useCallback(async () => {
    if (!user) return
    await hydrateProfile(user, 'manual')
  }, [hydrateProfile, user])

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, isOffline, signUp, signIn, signOut, resetPassword, reloadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
