import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { FamilyGroup, FamilyInvite, FamilyMember, FamilyRole } from '@/types/database'
import {
  createFamilyGroup,
  createFamilyInvite,
  getFamilyByUser,
  listFamilyInvites,
  reportFamilyError,
  updateFamilyGroup,
  updateFamilyMemberRole,
} from '@/services/firestore/family'

interface FamilyContextType {
  familyGroup: FamilyGroup | null
  members: FamilyMember[]
  invites: FamilyInvite[]
  memberRole: FamilyRole | null
  isLoading: boolean
  canManageFamily: boolean
  canEditSharedData: boolean
  createFamily: (name: string) => Promise<void>
  updateFamilyName: (name: string) => Promise<void>
  inviteMember: (email: string, role: FamilyRole) => Promise<void>
  updateMemberRole: (member: FamilyMember, role: FamilyRole) => Promise<void>
  reloadFamily: () => Promise<void>
}

export const FamilyContext = createContext<FamilyContextType | null>(null)

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [invites, setInvites] = useState<FamilyInvite[]>([])
  const [memberRole, setMemberRole] = useState<FamilyRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fetchInFlight = useRef<Promise<void> | null>(null)

  const fetchFamily = useCallback(async (userId: string) => {
    if (fetchInFlight.current) {
      return fetchInFlight.current
    }

    const run = async () => {
      setIsLoading(true)
      try {
        const data = await getFamilyByUser(userId)
        setFamilyGroup(data.group)
        setMembers(data.members)
        setMemberRole(data.memberRole)

        if (data.group) {
          const familyInvites = await listFamilyInvites(data.group.id)
          setInvites(familyInvites)
        } else {
          setInvites([])
        }
      } catch (error) {
        reportFamilyError('family.fetch', error, { uid: userId })
        setFamilyGroup(null)
        setMembers([])
        setInvites([])
        setMemberRole(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInFlight.current = run().finally(() => {
      fetchInFlight.current = null
    })

    return fetchInFlight.current
  }, [])

  useEffect(() => {
    if (user) {
      void fetchFamily(user.uid)
      return
    }

    setFamilyGroup(null)
    setMembers([])
    setInvites([])
    setMemberRole(null)
    setIsLoading(false)
  }, [user, fetchFamily])

  const reloadFamily = useCallback(async () => {
    if (!user) return
    await fetchFamily(user.uid)
  }, [fetchFamily, user])

  const createFamily = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Usuário não autenticado')
      await createFamilyGroup({ uid: user.uid, name })
      await fetchFamily(user.uid)
    },
    [fetchFamily, user],
  )

  const updateFamilyName = useCallback(
    async (name: string) => {
      if (!user || !familyGroup) throw new Error('Família não encontrada')
      await updateFamilyGroup({ uid: user.uid, familyGroupId: familyGroup.id, name })
      await fetchFamily(user.uid)
    },
    [familyGroup, fetchFamily, user],
  )

  const inviteMember = useCallback(
    async (email: string, role: FamilyRole) => {
      if (!user || !familyGroup) throw new Error('Família não encontrada')
      await createFamilyInvite({ uid: user.uid, familyGroupId: familyGroup.id, email, role })
      await fetchFamily(user.uid)
    },
    [familyGroup, fetchFamily, user],
  )

  const updateMemberRole = useCallback(
    async (member: FamilyMember, role: FamilyRole) => {
      if (!user) throw new Error('Usuário não autenticado')
      await updateFamilyMemberRole({ actorUid: user.uid, member, nextRole: role })
      await fetchFamily(user.uid)
    },
    [fetchFamily, user],
  )

  const canManage = memberRole === 'proprietario' || memberRole === 'administrador'

  return (
    <FamilyContext.Provider
      value={{
        familyGroup,
        members,
        invites,
        memberRole,
        isLoading,
        canManageFamily: canManage,
        canEditSharedData: canManage || memberRole === 'convidado_editor',
        createFamily,
        updateFamilyName,
        inviteMember,
        updateMemberRole,
        reloadFamily,
      }}
    >
      {children}
    </FamilyContext.Provider>
  )
}
