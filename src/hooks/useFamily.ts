import { useContext } from 'react'
import { FamilyContext } from '@/features/family/FamilyContext'

export function useFamily() {
  const context = useContext(FamilyContext)
  if (!context) {
    throw new Error('useFamily deve ser usado dentro de um FamilyProvider')
  }
  return context
}
