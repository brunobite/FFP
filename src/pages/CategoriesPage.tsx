import { useEffect, useMemo, useState } from 'react'
import { Plus, Tags } from 'lucide-react'
import { Button, Card, CardContent, EmptyState, Input, LoadingState, Modal } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { listCategories, upsertCategory } from '@/services/firestore/finance'
import type { Category, CategoryType } from '@/types/database'

interface CategoryForm {
  id?: string
  name: string
  type: CategoryType
  color: string
  icon: string
  isActive: boolean
}

const initialForm: CategoryForm = {
  name: '',
  type: 'expense',
  color: '',
  icon: '',
  isActive: true,
}

export function CategoriesPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<CategoryForm>(initialForm)
  const [saving, setSaving] = useState(false)

  const fetchRows = async () => {
    if (!user?.uid) return
    setLoading(true)
    setError('')
    try {
      const rows = await listCategories(user.uid)
      setItems(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar categorias.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const openNew = () => {
    setForm(initialForm)
    setIsModalOpen(true)
  }

  const openEdit = (row: Category) => {
    setForm({
      id: row.id,
      name: row.name,
      type: row.type,
      color: row.color || '',
      icon: row.icon || '',
      isActive: row.isActive,
    })
    setIsModalOpen(true)
  }

  const save = async () => {
    if (!user?.uid || !form.name.trim()) {
      setError('Informe um nome para a categoria.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await upsertCategory(user.uid, form)
      setFeedback(form.id ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.')
      setIsModalOpen(false)
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar categoria.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (row: Category) => {
    if (!user?.uid) return
    setError('')
    try {
      await upsertCategory(user.uid, {
        id: row.id,
        name: row.name,
        type: row.type,
        color: row.color || '',
        icon: row.icon || '',
        parentCategoryId: row.parentCategoryId,
        isActive: !row.isActive,
      })
      setFeedback(`Categoria ${!row.isActive ? 'ativada' : 'inativada'} com sucesso.`)
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar categoria.')
    }
  }

  const sorted = useMemo(() => items, [items])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Categorias</h1>
          <p className="text-sm text-text-secondary">Organize receitas e despesas da família.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
          Nova categoria
        </Button>
      </div>

      {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? (
        <LoadingState title="Carregando categorias" description="Buscando dados no Firestore..." />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria cadastrada"
          description="Crie a primeira categoria para começar a classificar os lançamentos de receita e despesa."
          icon={Tags}
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto py-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-3">Nome</th>
                  <th>Tipo</th>
                  <th>Cor</th>
                  <th>Ícone</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 text-text-primary">
                    <td className="py-3 font-medium">{row.name}</td>
                    <td>{row.type === 'income' ? 'Receita' : 'Despesa'}</td>
                    <td>{row.color || '-'}</td>
                    <td>{row.icon || '-'}</td>
                    <td>{row.isActive ? 'Ativa' : 'Inativa'}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void toggleActive(row)}>
                          {row.isActive ? 'Inativar' : 'Ativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? 'Editar categoria' : 'Nova categoria'}>
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Tipo</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-bg-card px-3 text-sm"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as CategoryType }))}
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
          <Input label="Cor (opcional)" value={form.color} placeholder="#22c55e" onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))} />
          <Input label="Ícone (opcional)" value={form.icon} placeholder="home" onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))} />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button isLoading={saving} onClick={() => void save()}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
