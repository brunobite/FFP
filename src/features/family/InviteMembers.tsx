import { useState } from 'react'
import { Send } from 'lucide-react'
import { useFamily } from '@/hooks/useFamily'
import { Button, Input } from '@/components/ui'

export function InviteMembers() {
  const { inviteMember } = useFamily()
  const [email, setEmail] = useState('')
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
      await inviteMember(email.trim())
      setSuccess(`Convite enviado para ${email}`)
      setEmail('')
    } catch {
      setError('Erro ao enviar convite. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-bold text-text-primary">Convidar membro</h3>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <form onSubmit={handleInvite} className="flex gap-3">
        <Input
          placeholder="E-mail do membro"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" isLoading={isSubmitting} leftIcon={<Send className="h-4 w-4" />}>
          Convidar
        </Button>
      </form>
    </div>
  )
}
