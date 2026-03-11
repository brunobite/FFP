import { Card, CardContent } from '@/components/ui'
import { InviteMembers } from '@/features/family/InviteMembers'
import { useFamily } from '@/hooks/useFamily'

export function FamilyInvitesPage() {
  const { invites, canManageFamily } = useFamily()

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {canManageFamily ? <InviteMembers /> : <p className="text-sm text-text-secondary">Sem permissão para convidar membros.</p>}
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Convites</h3>
          <ul className="mt-2 space-y-2 text-sm text-text-secondary">
            {invites.map((invite) => (
              <li key={invite.id}>{invite.email} — {invite.role} — {invite.status}</li>
            ))}
            {invites.length === 0 && <li>Nenhum convite registrado.</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
