import { Card, CardContent } from '@/components/ui'
import { useFamily } from '@/hooks/useFamily'

export function FamilyMembersPage() {
  const { members } = useFamily()

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Membros</h2>
        <ul className="space-y-2 text-sm text-text-secondary">
          {members.map((member) => (
            <li key={member.id}>{member.uid} — {member.role}</li>
          ))}
          {members.length === 0 && <li>Nenhum membro vinculado.</li>}
        </ul>
      </CardContent>
    </Card>
  )
}
