import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BadgeDollarSign,
  Briefcase,
  Car,
  ChevronDown,
  ChevronUp,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  Pill,
  Plus,
  Receipt,
  ShoppingCart,
  Target,
  Tags,
  Ticket,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
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

const PRESET_COLORS = ['#22c55e', '#16a34a', '#2563eb', '#0ea5e9', '#7c3aed', '#db2777', '#ef4444', '#f59e0b', '#64748b', '#14b8a6']

const PRESET_ICONS = [
  { id: 'casa', label: 'Casa', icon: Home },
  { id: 'mercado', label: 'Mercado', icon: ShoppingCart },
  { id: 'carro', label: 'Carro', icon: Car },
  { id: 'combustivel', label: 'Combustível', icon: Fuel },
  { id: 'saude', label: 'Saúde', icon: HeartPulse },
  { id: 'farmacia', label: 'Farmácia', icon: Pill },
  { id: 'educacao', label: 'Educação', icon: GraduationCap },
  { id: 'lazer', label: 'Lazer', icon: Ticket },
  { id: 'trabalho', label: 'Trabalho', icon: Briefcase },
  { id: 'cartao', label: 'Cartão', icon: BadgeDollarSign },
  { id: 'dinheiro', label: 'Dinheiro', icon: HandCoins },
  { id: 'meta', label: 'Meta', icon: Target },
  { id: 'presente', label: 'Presente', icon: Gift },
  { id: 'filhos', label: 'Filhos', icon: Activity },
  { id: 'assinatura', label: 'Assinatura', icon: Receipt },
  { id: 'restaurante', label: 'Restaurante', icon: UtensilsCrossed },
  { id: 'viagem', label: 'Viagem', icon: Wallet },
  { id: 'impostos', label: 'Impostos', icon: Landmark },
] as const

const initialForm: CategoryForm = {
  name: '',
  type: 'expense',
  color: PRESET_COLORS[0] ?? '#22c55e',
  icon: PRESET_ICONS[0]?.id ?? 'casa',
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
  const [formError, setFormError] = useState('')
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)

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
    setFormError('')
    setIsColorPickerOpen(false)
    setIsIconPickerOpen(false)
    setIsModalOpen(true)
  }

  const openEdit = (row: Category) => {
    setForm({
      id: row.id,
      name: row.name,
      type: row.type,
      color: row.color || PRESET_COLORS[0] || '#22c55e',
      icon: row.icon || PRESET_ICONS[0]?.id || 'casa',
      isActive: row.isActive,
    })
    setFormError('')
    setIsColorPickerOpen(false)
    setIsIconPickerOpen(false)
    setIsModalOpen(true)
  }

  const selectedIcon = PRESET_ICONS.find((icon) => icon.id === form.icon) ?? PRESET_ICONS[0]

  const save = async () => {
    if (!user?.uid) {
      setError('Faça login novamente para salvar a categoria.')
      return
    }

    if (!form.name.trim()) {
      setFormError('Informe um nome para a categoria.')
      return
    }

    if (!form.icon) {
      setFormError('Selecione um ícone para a categoria.')
      return
    }

    setSaving(true)
    setFormError('')
    setError('')
    setFeedback('')
    try {
      await upsertCategory(user.uid, form)
      setFeedback(form.id ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.')
      setIsModalOpen(false)
      await fetchRows()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao salvar categoria.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (row: Category) => {
    if (!user?.uid) {
      setError('Faça login novamente para continuar.')
      return
    }
    setError('')
    setFeedback('')
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
                    <td>
                      {row.color ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: row.color }} />
                          {row.color}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{PRESET_ICONS.find((icon) => icon.id === row.icon)?.label || row.icon || '-'}</td>
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

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Cor</label>
            <button
              type="button"
              className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-bg-card px-3 text-sm text-text-primary"
              onClick={() => setIsColorPickerOpen((prev) => !prev)}
              aria-expanded={isColorPickerOpen}
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: form.color }} />
                {form.color}
              </span>
              {isColorPickerOpen ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
            </button>
            <div className={isColorPickerOpen ? 'mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10' : 'hidden'}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, color }))
                    setIsColorPickerOpen(false)
                  }}
                  className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-105"
                  style={{
                    backgroundColor: color,
                    borderColor: form.color === color ? 'white' : 'transparent',
                    boxShadow: form.color === color ? `0 0 0 2px ${color}` : 'none',
                  }}
                  aria-label={`Selecionar cor ${color}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Ícone</label>
            <button
              type="button"
              className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-bg-card px-3 text-sm text-text-primary"
              onClick={() => setIsIconPickerOpen((prev) => !prev)}
              aria-expanded={isIconPickerOpen}
            >
              <span className="inline-flex items-center gap-2">
                {selectedIcon ? <selectedIcon.icon className="h-4 w-4" /> : null}
                {selectedIcon?.label ?? form.icon}
              </span>
              {isIconPickerOpen ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
            </button>
            <div className={isIconPickerOpen ? 'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3' : 'hidden'}>
              {PRESET_ICONS.map((iconOption) => {
                const Icon = iconOption.icon
                const selected = form.icon === iconOption.id
                return (
                  <button
                    key={iconOption.id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, icon: iconOption.id }))
                      setIsIconPickerOpen(false)
                    }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:border-primary/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{iconOption.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
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
