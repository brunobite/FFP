import { Card, CardContent } from '@/components/ui'
import { useFamily } from '@/hooks/useFamily'

export function FamilyProfilePage() {
  const { familyGroup, members, memberRole, canEditSharedData } = useFamily()

  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <h2 className="text-lg font-semibold text-text-primary">Perfil familiar</h2>
        <p className="text-sm text-text-secondary">Nome: {familyGroup?.name || 'Não configurado'}</p>
        <p className="text-sm text-text-secondary">Membros: {members.length}</p>
        <p className="text-sm text-text-secondary">Seu papel: {memberRole || 'Sem papel'}</p>
        <p className="text-sm text-text-secondary">Pode editar dados compartilhados: {canEditSharedData ? 'Sim' : 'Não'}</p>
      </CardContent>
    </Card>
  )
}
