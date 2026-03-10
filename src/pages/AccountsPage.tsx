import { useEffect, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { Button, Card, CardContent, EmptyState, Input, LoadingState, Modal } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { listAccounts, upsertAccount } from '@/services/firestore/finance'
import type { Account, AccountType } from '@/types/database'

interface AccountForm {
  id?: string
  name: string
  type: AccountType
  initialBalance: string
  isActive: boolean
}

const initialForm: AccountForm = {
  name: '',
  type: 'checking',
  initialBalance: '0',
  isActive: true,
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function AccountsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<AccountForm>(initialForm)
  const [saving, setSaving] = useState(false)

  const fetchRows = async () => {
    if (!user?.uid) return
    setLoading(true)
    setError('')
    try {
      const rows = await listAccounts(user.uid)
      setItems(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar contas.')
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

  const openEdit = (row: Account) => {
    setForm({
      id: row.id,
      name: row.name,
      type: row.type,
      initialBalance: String(row.initialBalance),
      isActive: row.isActive,
    })
    setIsModalOpen(true)
  }

  const save = async () => {
    if (!user?.uid || !form.name.trim()) {
      setError('Informe um nome para a conta.')
      return
    }

    const parsedBalance = Number(form.initialBalance)
    if (Number.isNaN(parsedBalance)) {
      setError('Saldo inicial inválido.')
      return
    }

    setSaving(true)
    setError('')
    setFeedback('')
    try {
      await upsertAccount(user.uid, {
        id: form.id,
        name: form.name,
        type: form.type,
        initialBalance: parsedBalance,
        isActive: form.isActive,
      })
      setFeedback(form.id ? 'Conta atualizada com sucesso.' : 'Conta criada com sucesso.')
      setIsModalOpen(false)
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar conta.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (row: Account) => {
    if (!user?.uid) {
      setError('Faça login novamente para continuar.')
      return
    }
    setError('')
    setFeedback('')
    try {
      await upsertAccount(user.uid, {
        id: row.id,
        name: row.name,
        type: row.type,
        initialBalance: row.initialBalance,
        isActive: !row.isActive,
      })
      setFeedback(`Conta ${!row.isActive ? 'ativada' : 'inativada'} com sucesso.`)
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar conta.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Contas</h1>
          <p className="text-sm text-text-secondary">Gerencie as contas financeiras da família.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
          Nova conta
        </Button>
      </div>

      {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? (
        <LoadingState title="Carregando contas" description="Buscando dados no Firestore..." />
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma conta cadastrada" description="Cadastre a primeira conta para registrar lançamentos." icon={Wallet} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto py-0">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-3">Nome</th>
                  <th>Tipo</th>
                  <th>Saldo inicial</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 text-text-primary">
                    <td className="py-3 font-medium">{row.name}</td>
                    <td>{row.type}</td>
                    <td>{formatCurrency(row.initialBalance)}</td>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? 'Editar conta' : 'Nova conta'}>
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary">Tipo</label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-bg-card px-3 text-sm"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as AccountType }))}
            >
              <option value="checking">Conta corrente</option>
              <option value="wallet">Carteira</option>
              <option value="savings">Poupança</option>
              <option value="cash">Dinheiro</option>
            </select>
          </div>
          <Input
            type="number"
            step="0.01"
            label="Saldo inicial"
            value={form.initialBalance}
            onChange={(event) => setForm((prev) => ({ ...prev, initialBalance: event.target.value }))}
          />
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
