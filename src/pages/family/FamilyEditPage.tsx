import { useState } from 'react'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { useFamily } from '@/hooks/useFamily'

export function FamilyEditPage() {
  const { familyGroup, canManageFamily, updateFamilyName } = useFamily()
  const [name, setName] = useState(familyGroup?.name || '')
  const [feedback, setFeedback] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    try {
      await updateFamilyName(name.trim())
      setFeedback('Nome atualizado com sucesso.')
    } catch (error) {
      setFeedback((error as Error).message)
    }
  }

  if (!canManageFamily) {
    return <Card><CardContent className="pt-6 text-sm text-text-secondary">Somente proprietário e administrador podem editar.</CardContent></Card>
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-3">
          <Input label="Nome da família" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit">Salvar</Button>
          {feedback && <p className="text-sm text-text-secondary">{feedback}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
