import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { FamilyGroup, FamilyMember } from '@/types/database'
import { createFamilyGroup, getFamilyByUser } from '@/services/firestore/family'

interface FamilyContextType {
  familyGroup: FamilyGroup | null
  members: FamilyMember[]
  isLoading: boolean
  createFamily: (name: string) => Promise<void>
  inviteMember: (_email: string) => Promise<void>
}

export const FamilyContext = createContext<FamilyContextType | null>(null)

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchFamily = useCallback(async (userId: string) => {
    setIsLoading(true)
    try {
      const data = await getFamilyByUser(userId)
      setFamilyGroup(data.group)
      setMembers(data.members)
    } catch {
      setFamilyGroup(null)
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchFamily(user.uid)
    } else {
      setFamilyGroup(null)
      setMembers([])
      setIsLoading(false)
    }
  }, [user, fetchFamily])

  const createFamily = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Usuário não autenticado')
      await createFamilyGroup({ uid: user.uid, name })
      await fetchFamily(user.uid)
    },
    [fetchFamily, user],
  )

  const inviteMember = useCallback(async () => {
    throw new Error('Convites serão implementados no próximo bloco.')
  }, [])

  return <FamilyContext.Provider value={{ familyGroup, members, isLoading, createFamily, inviteMember }}>{children}</FamilyContext.Provider>
}
