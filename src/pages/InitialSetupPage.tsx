import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, WifiOff } from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { createFamilyGroup } from '@/services/firestore/family'
import { classifyFirestoreFailure, mapFirestoreError } from '@/services/firestore/errors'

export function InitialSetupPage() {
  const { user, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [familyName, setFamilyName] = useState('')
  const [error, setError] = useState('')
  const [errorIsOffline, setErrorIsOffline] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateFamily = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    try {
      setError('')
      setErrorIsOffline(false)
      setIsSubmitting(true)

      if (!navigator.onLine) {
        setErrorIsOffline(true)
        setError('Sem conexão com a internet. Conecte-se para criar seu grupo familiar.')
        return
      }

      await createFamilyGroup({ uid: user.uid, name: familyName.trim() || 'Minha Família' })
      await reloadProfile()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('[family][setup] falha ao criar família', {
        uid: user.uid,
        online: navigator.onLine,
        familyName: familyName.trim() || 'Minha Família',
        error: err,
      })

      const diagnosis = classifyFirestoreFailure(err)
      if (diagnosis === 'network disabled/offline' && !navigator.onLine) {
        setErrorIsOffline(true)
        setError('Você está sem conexão. Verifique sua internet e tente novamente.')
      } else {
        setErrorIsOffline(false)
        setError(mapFirestoreError('concluir a configuração inicial da família', err))
      }
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

          {error && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${errorIsOffline ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
              {errorIsOffline && <WifiOff className="h-4 w-4 shrink-0" />}
              {error}
            </div>
          )}

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
