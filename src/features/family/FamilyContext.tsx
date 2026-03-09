import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { FamilyGroup, FamilyMember } from '@/types/database'

interface FamilyContextType {
  familyGroup: FamilyGroup | null
  members: FamilyMember[]
  isLoading: boolean
  createFamily: (name: string) => Promise<void>
  inviteMember: (email: string) => Promise<void>
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
      const { data: membership } = await supabase
        .from('family_members')
        .select('family_group_id')
        .eq('user_id', userId)
        .limit(1)
        .single()

      if (membership) {
        const { data: group } = await supabase
          .from('family_groups')
          .select('*')
          .eq('id', membership.family_group_id)
          .single()

        setFamilyGroup(group as FamilyGroup | null)

        const { data: memberList } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_group_id', membership.family_group_id)

        setMembers((memberList as FamilyMember[] | null) ?? [])
      } else {
        setFamilyGroup(null)
        setMembers([])
      }
    } catch {
      setFamilyGroup(null)
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchFamily(user.id)
    } else {
      setFamilyGroup(null)
      setMembers([])
      setIsLoading(false)
    }
  }, [user, fetchFamily])

  const createFamily = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Usuário não autenticado')

      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .insert({ name, created_by: user.id })
        .select()
        .single()

      if (groupError || !group) throw groupError ?? new Error('Erro ao criar grupo')

      const typedGroup = group as FamilyGroup

      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_group_id: typedGroup.id,
          user_id: user.id,
          role: 'admin',
        })

      if (memberError) throw memberError

      setFamilyGroup(typedGroup)
      setMembers([
        {
          id: crypto.randomUUID(),
          family_group_id: typedGroup.id,
          user_id: user.id,
          role: 'admin',
          joined_at: new Date().toISOString(),
        },
      ])
    },
    [user],
  )

  const inviteMember = useCallback(
    async (email: string) => {
      if (!user || !familyGroup) throw new Error('Grupo familiar não encontrado')

      const { error } = await supabase
        .from('family_invites')
        .insert({
          family_group_id: familyGroup.id,
          invited_by: user.id,
          email,
        })

      if (error) throw error
    },
    [user, familyGroup],
  )

  return (
    <FamilyContext.Provider
      value={{ familyGroup, members, isLoading, createFamily, inviteMember }}
    >
      {children}
    </FamilyContext.Provider>
  )
}
