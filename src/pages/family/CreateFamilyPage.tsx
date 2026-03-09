import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus } from 'lucide-react'
import { useFamily } from '@/hooks/useFamily'
import { Button, Input, Card, CardContent } from '@/components/ui'

export function CreateFamilyPage() {
  const { createFamily } = useFamily()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'choose' | 'create' | 'invite'>('choose')
  const [familyName, setFamilyName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyName.trim()) return

    try {
      setError('')
      setIsSubmitting(true)
      await createFamily(familyName.trim())
      navigate('/')
    } catch {
      setError('Erro ao criar grupo familiar. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-3xl font-bold text-white">
            $
          </div>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">Bem-vindo ao FFP!</h1>
          <p className="text-sm text-text-secondary">
            Para começar, crie ou entre em um grupo familiar.
          </p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-4">
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setMode('create')}>
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Criar grupo familiar</h3>
                  <p className="text-sm text-text-secondary">
                    Comece um novo grupo e convide sua família.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setMode('invite')}>
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-info/10">
                  <UserPlus className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Tenho um convite</h3>
                  <p className="text-sm text-text-secondary">
                    Participe de um grupo familiar existente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === 'create' && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-lg font-bold text-text-primary">Criar grupo familiar</h2>

              {error && (
                <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label="Nome do grupo"
                  placeholder="Ex: Família Silva"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="outline" type="button" onClick={() => setMode('choose')} className="flex-1">
                    Voltar
                  </Button>
                  <Button type="submit" isLoading={isSubmitting} className="flex-1">
                    Criar grupo
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {mode === 'invite' && (
          <Card>
            <CardContent className="py-8 text-center">
              <UserPlus className="mx-auto mb-4 h-12 w-12 text-text-secondary" />
              <h2 className="mb-2 text-lg font-bold text-text-primary">Aceitar convite</h2>
              <p className="mb-6 text-sm text-text-secondary">
                Esta funcionalidade será implementada na próxima etapa. Peça ao administrador
                do grupo para enviar um convite para seu e-mail.
              </p>
              <Button variant="outline" onClick={() => setMode('choose')}>
                Voltar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
