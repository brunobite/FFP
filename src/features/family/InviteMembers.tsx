import { useState } from 'react'
import { Send } from 'lucide-react'
import { useFamily } from '@/hooks/useFamily'
import { Button, Input } from '@/components/ui'
import type { FamilyRole } from '@/types/database'

export function InviteMembers() {
  const { inviteMember } = useFamily()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<FamilyRole>('convidado_editor')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      setError('')
      setSuccess('')
      setIsSubmitting(true)
      await inviteMember(email.trim(), role)
      setSuccess(`Convite enviado para ${email}`)
      setEmail('')
    } catch (err) {
      setError((err as Error).message || 'Erro ao enviar convite. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-bold text-text-primary">Convidar membro</h3>
      {error && <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

      <form onSubmit={handleInvite} className="space-y-3">
        <Input placeholder="E-mail do membro" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
        <select className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as FamilyRole)}>
          <option value="convidado_editor">Convidado editor</option>
          <option value="administrador">Administrador</option>
        </select>
        <Button type="submit" isLoading={isSubmitting} leftIcon={<Send className="h-4 w-4" />}>
          Convidar
        </Button>
      </form>
    </div>
  )
}
