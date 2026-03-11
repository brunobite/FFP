import { Card, CardContent } from '@/components/ui'
import { useFamily } from '@/hooks/useFamily'
import type { FamilyRole } from '@/types/database'

const roles: FamilyRole[] = ['proprietario', 'administrador', 'convidado_editor']

export function FamilyPermissionsPage() {
  const { members, canManageFamily, updateMemberRole } = useFamily()

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Permissões</h2>
        {!canManageFamily && <p className="mb-3 text-sm text-text-secondary">Somente proprietário e administrador podem alterar papéis.</p>}
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2">
              <span className="text-sm text-text-primary">{member.uid}</span>
              <select
                disabled={!canManageFamily}
                className="rounded-lg border border-border bg-bg-card px-2 py-1 text-sm"
                value={member.role}
                onChange={(event) => void updateMemberRole(member, event.target.value as FamilyRole)}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
