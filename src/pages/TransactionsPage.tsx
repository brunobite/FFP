import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, EmptyState, Input, LoadingState, Modal } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import {
  deleteTransaction,
  listAccounts,
  listCategories,
  listFamilyMembersSummary,
  listTransactions,
  upsertTransaction,
} from '@/services/firestore/finance'
import type { Account, Category, FamilyMemberSummary, Transaction, TransactionType } from '@/types/database'

interface TransactionForm {
  id?: string
  type: TransactionType
  description: string
  amount: string
  date: string
  categoryId: string
  accountId: string
  memberUid: string
  notes: string
}

const today = new Date().toISOString().slice(0, 10)

const initialForm: TransactionForm = {
  type: 'expense',
  description: '',
  amount: '',
  date: today,
  categoryId: '',
  accountId: '',
  memberUid: '',
  notes: '',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function TransactionsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [members, setMembers] = useState<FamilyMemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<TransactionForm>(initialForm)

  const fetchData = async () => {
    if (!user?.uid) return
    setLoading(true)
    setError('')

    try {
      const [txRows, categoryRows, accountRows, memberRows] = await Promise.all([
        listTransactions(user.uid),
        listCategories(user.uid),
        listAccounts(user.uid),
        listFamilyMembersSummary(user.uid),
      ])
      setItems(txRows)
      setCategories(categoryRows)
      setAccounts(accountRows)
      setMembers(memberRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar lançamentos.')
      setItems([])
      setCategories([])
      setAccounts([])
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const activeAccounts = useMemo(() => accounts.filter((item) => item.isActive), [accounts])
  const categoriesByType = useMemo(
    () => categories.filter((item) => item.isActive && item.type === form.type),
    [categories, form.type],
  )

  const openNew = () => {
    const fallbackMember = members[0]?.uid || ''
    setForm({ ...initialForm, memberUid: fallbackMember })
    setIsModalOpen(true)
  }

  const openEdit = (row: Transaction) => {
    setForm({
      id: row.id,
      type: row.type,
      description: row.description,
      amount: String(row.amount),
      date: row.date,
      categoryId: row.categoryId,
      accountId: row.accountId,
      memberUid: row.memberUid,
      notes: row.notes,
    })
    setIsModalOpen(true)
  }

  const validate = () => {
    if (!form.description.trim()) return 'Informe uma descrição.'
    if (!form.amount || Number(form.amount) <= 0) return 'Informe um valor válido.'
    if (!form.date) return 'Informe a data.'
    if (!form.categoryId) return 'Selecione uma categoria.'
    if (!form.accountId) return 'Selecione uma conta ativa.'
    if (!form.memberUid) return 'Selecione um membro responsável.'
    return ''
  }

  const save = async () => {
    if (!user?.uid) return
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      await upsertTransaction(user.uid, {
        id: form.id,
        type: form.type,
        description: form.description,
        amount: Number(form.amount),
        date: form.date,
        categoryId: form.categoryId,
        accountId: form.accountId,
        memberUid: form.memberUid,
        notes: form.notes,
        status: 'posted',
      })
      setFeedback(form.id ? 'Lançamento atualizado com sucesso.' : 'Lançamento criado com sucesso.')
      setIsModalOpen(false)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar lançamento.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: Transaction) => {
    if (!user?.uid) return
    setError('')
    try {
      await deleteTransaction(user.uid, row.id)
      setFeedback('Lançamento excluído com sucesso.')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir lançamento.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Lançamentos</h1>
          <p className="text-sm text-text-secondary">Registre receitas e despesas reais da família.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
          Novo lançamento
        </Button>
      </div>

      {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? (
        <LoadingState title="Carregando lançamentos" description="Buscando dados no Firestore..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum lançamento encontrado"
          description="Crie o primeiro lançamento para alimentar o dashboard e o fluxo financeiro."
          icon={ArrowUpDown}
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto py-0">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-3">Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Conta</th>
                  <th>Responsável</th>
                  <th>Valor</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 text-text-primary">
                    <td className="py-3">{new Date(`${row.date}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td className="font-medium">{row.description}</td>
                    <td>{row.type === 'income' ? 'Receita' : 'Despesa'}</td>
                    <td>{categories.find((item) => item.id === row.categoryId)?.name || '-'}</td>
                    <td>{accounts.find((item) => item.id === row.accountId)?.name || '-'}</td>
                    <td>{members.find((item) => item.uid === row.memberUid)?.displayName || '-'}</td>
                    <td className={row.type === 'income' ? 'font-semibold text-success' : 'font-semibold text-danger'}>
                      {row.type === 'income' ? '+' : '-'} {formatCurrency(row.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void remove(row)} leftIcon={<Trash2 className="h-4 w-4" />}>
                          Excluir
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? 'Editar lançamento' : 'Novo lançamento'} size="lg">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Tipo</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-bg-card px-3 text-sm"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value as TransactionType,
                  categoryId: '',
                }))
              }
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
          <Input label="Data" type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
          <div className="md:col-span-2">
            <Input label="Descrição" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </div>
          <Input
            label="Valor"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Categoria</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-bg-card px-3 text-sm"
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            >
              <option value="">Selecione</option>
              {categoriesByType.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Conta</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-bg-card px-3 text-sm"
              value={form.accountId}
              onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))}
            >
              <option value="">Selecione</option>
              {activeAccounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Responsável</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-bg-card px-3 text-sm"
              value={form.memberUid}
              onChange={(event) => setForm((prev) => ({ ...prev, memberUid: event.target.value }))}
            >
              <option value="">Selecione</option>
              {members.map((item) => (
                <option key={item.uid} value={item.uid}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Observações (opcional)</label>
            <textarea
              className="min-h-20 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button isLoading={saving} onClick={() => void save()}>
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
