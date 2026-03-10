import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { createFamilyGroup } from '@/services/firestore/family'
import { mapFirestoreError } from '@/services/firestore/errors'

export function InitialSetupPage() {
  const { user, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [familyName, setFamilyName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateFamily = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    try {
      setError('')
      setIsSubmitting(true)
      await createFamilyGroup({ uid: user.uid, name: familyName.trim() || 'Minha Família' })
      await reloadProfile()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(mapFirestoreError('concluir a configuração inicial', err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center">
      <Card className="w-full">
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Finalize sua configuração inicial</h1>
              <p className="text-sm text-text-secondary">
                Para usar categorias, contas e lançamentos, precisamos concluir seu grupo familiar.
              </p>
            </div>
          </div>

          {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

          <form onSubmit={handleCreateFamily} className="space-y-4">
            <Input
              label="Nome do grupo familiar"
              placeholder="Ex: Família Silva"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
            />
            <Button isLoading={isSubmitting} type="submit" className="w-full">
              Criar grupo e continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
