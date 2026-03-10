import { getFirestoreClient } from '@/lib/firebase/sdk'
import { getFamilyByUser } from '@/services/firestore/family'
import { logFirestoreError, mapFirestoreError } from '@/services/firestore/errors'
import type {
  Account,
  AccountType,
  Category,
  CategoryType,
  FamilyMemberSummary,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@/types/database'

interface BaseDoc {
  familyGroupId?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

interface CategoryDoc extends BaseDoc {
  name?: string
  type?: CategoryType
  color?: string
  icon?: string
  parentCategoryId?: string | null
}

interface AccountDoc extends BaseDoc {
  name?: string
  type?: AccountType
  initialBalance?: number
}

interface TransactionDoc extends BaseDoc {
  type?: TransactionType
  description?: string
  amount?: number
  date?: string
  categoryId?: string
  accountId?: string
  memberUid?: string
  notes?: string
  status?: TransactionStatus
}

function nowIso() {
  return new Date().toISOString()
}

async function resolveFamilyGroupId(uid: string) {
  const family = await getFamilyByUser(uid)
  if (!family.group?.id) {
    const error = new Error('Usuário sem grupo familiar para acessar dados financeiros.') as Error & { code: string }
    error.code = 'missing-family-group'
    throw error
  }

  console.debug('[firestore][context] familyGroupId resolvido', { uid, familyGroupId: family.group.id })
  return { familyGroupId: family.group.id, members: family.members }
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  return 0
}

function ensureDocBelongsToFamily(docFamilyGroupId: string | undefined, expectedFamilyGroupId: string, entityLabel: string) {
  if (!docFamilyGroupId || docFamilyGroupId !== expectedFamilyGroupId) {
    throw new Error(`${entityLabel} não encontrado para este grupo familiar.`)
  }
}

export async function listCategories(uid: string): Promise<Category[]> {
  try {
    const { familyGroupId } = await resolveFamilyGroupId(uid)
    const db = await getFirestoreClient()
    const snapshot = await db.collection('categories').where('familyGroupId', '==', familyGroupId).get()

    return snapshot.docs
      .map((doc) => {
        const data = (doc.data() || {}) as CategoryDoc
        return {
          id: doc.id,
          familyGroupId,
          name: data.name || 'Categoria',
          type: data.type === 'income' ? 'income' : 'expense',
          color: data.color || null,
          icon: data.icon || null,
          parentCategoryId: data.parentCategoryId || null,
          isActive: data.isActive ?? true,
          createdAt: data.createdAt || nowIso(),
          updatedAt: data.updatedAt || nowIso(),
        } satisfies Category
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  } catch (error) {
    logFirestoreError('categories.list', error, { uid })
    throw new Error(mapFirestoreError('carregar', error))
  }
}

export async function upsertCategory(
  uid: string,
  payload: { id?: string; name: string; type: CategoryType; color?: string; icon?: string; parentCategoryId?: string | null; isActive?: boolean },
) {
  try {
    const { familyGroupId } = await resolveFamilyGroupId(uid)
    const db = await getFirestoreClient()
    const now = nowIso()

    const base = {
      familyGroupId,
      name: payload.name.trim(),
      type: payload.type,
      color: payload.color?.trim() || null,
      icon: payload.icon?.trim() || null,
      parentCategoryId: payload.parentCategoryId || null,
      isActive: payload.isActive ?? true,
      updatedAt: now,
    }

    if (payload.id) {
      const docRef = db.doc(`categories/${payload.id}`)
      const snapshot = await docRef.get()
      const current = (snapshot.data() || {}) as CategoryDoc
      if (!snapshot.exists) throw new Error('Categoria não encontrada para atualização.')
      ensureDocBelongsToFamily(current.familyGroupId, familyGroupId, 'Categoria')
      await docRef.set(base, { merge: true })
      return payload.id
    }

    const created = await db.collection('categories').add({ ...base, createdAt: now })
    return created.id
  } catch (error) {
    logFirestoreError('categories.upsert', error, { uid, categoryId: payload.id || null })
    throw new Error(mapFirestoreError(payload.id ? 'atualizar' : 'salvar', error))
  }
}

export async function listAccounts(uid: string): Promise<Account[]> {
  try {
    const { familyGroupId } = await resolveFamilyGroupId(uid)
    const db = await getFirestoreClient()
    const snapshot = await db.collection('accounts').where('familyGroupId', '==', familyGroupId).get()

    return snapshot.docs
      .map((doc) => {
        const data = (doc.data() || {}) as AccountDoc
        return {
          id: doc.id,
          familyGroupId,
          name: data.name || 'Conta',
          type: data.type || 'checking',
          initialBalance: toNumber(data.initialBalance),
          isActive: data.isActive ?? true,
          createdAt: data.createdAt || nowIso(),
          updatedAt: data.updatedAt || nowIso(),
        } satisfies Account
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  } catch (error) {
    logFirestoreError('accounts.list', error, { uid })
    throw new Error(mapFirestoreError('carregar', error))
  }
}

export async function upsertAccount(
  uid: string,
  payload: { id?: string; name: string; type: AccountType; initialBalance: number; isActive?: boolean },
) {
  try {
    const { familyGroupId } = await resolveFamilyGroupId(uid)
    const db = await getFirestoreClient()
    const now = nowIso()

    const base = {
      familyGroupId,
      name: payload.name.trim(),
      type: payload.type,
      initialBalance: payload.initialBalance,
      isActive: payload.isActive ?? true,
      updatedAt: now,
    }

    if (payload.id) {
      const docRef = db.doc(`accounts/${payload.id}`)
      const snapshot = await docRef.get()
      const current = (snapshot.data() || {}) as AccountDoc
      if (!snapshot.exists) throw new Error('Conta não encontrada para atualização.')
      ensureDocBelongsToFamily(current.familyGroupId, familyGroupId, 'Conta')
      await docRef.set(base, { merge: true })
      return payload.id
    }

    const created = await db.collection('accounts').add({ ...base, createdAt: now })
    return created.id
  } catch (error) {
    logFirestoreError('accounts.upsert', error, { uid, accountId: payload.id || null })
    throw new Error(mapFirestoreError(payload.id ? 'atualizar' : 'salvar', error))
  }
}

export async function listFamilyMembersSummary(uid: string): Promise<FamilyMemberSummary[]> {
  try {
    const { members } = await resolveFamilyGroupId(uid)
    const db = await getFirestoreClient()

    const rows = await Promise.all(
      members.map(async (member) => {
        const profile = await db.doc(`users/${member.uid}`).get()
        const profileData = profile.data() as { displayName?: string; email?: string } | undefined
        return {
          uid: member.uid,
          role: member.role,
          displayName: profileData?.displayName || profileData?.email || 'Membro',
        } satisfies FamilyMemberSummary
      }),
    )

    return rows.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'))
  } catch (error) {
    logFirestoreError('family.members.summary', error, { uid })
    throw new Error(mapFirestoreError('carregar', error))
  }
}

export async function listTransactions(uid: string): Promise<Transaction[]> {
  try {
    const { familyGroupId } = await resolveFamilyGroupId(uid)
    const db = await getFirestoreClient()
    const snapshot = await db.collection('transactions').where('familyGroupId', '==', familyGroupId).get()

    return snapshot.docs
      .map((doc) => {
        const data = (doc.data() || {}) as TransactionDoc
        return {
          id: doc.id,
          familyGroupId,
          type: data.type === 'income' ? 'income' : 'expense',
          description: data.description || 'Lançamento',
          amount: toNumber(data.amount),
          date: data.date || new Date().toISOString().slice(0, 10),
          categoryId: data.categoryId || '',
          accountId: data.accountId || '',
          memberUid: data.memberUid || '',
          notes: data.notes || '',
          status: data.status || 'posted',
          createdAt: data.createdAt || nowIso(),
          updatedAt: data.updatedAt || nowIso(),
        } satisfies Transaction
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    logFirestoreError('transactions.list', error, { uid })
    throw new Error(mapFirestoreError('carregar', error))
  }
}

export async function upsertTransaction(
  uid: string,
  payload: {
    id?: string
    type: TransactionType
    description: string
    amount: number
    date: string
    categoryId: string
    accountId: string
    memberUid: string
    notes?: string
    status: TransactionStatus
  },
) {
  try {
    const { familyGroupId } = await resolveFamilyGroupId(uid)
    const db = await getFirestoreClient()
    const now = nowIso()

    const base = {
      familyGroupId,
      type: payload.type,
      description: payload.description.trim(),
      amount: payload.amount,
      date: payload.date,
      categoryId: payload.categoryId,
      accountId: payload.accountId,
      memberUid: payload.memberUid,
      notes: payload.notes?.trim() || '',
      status: payload.status,
      updatedAt: now,
    }

    if (payload.id) {
      const docRef = db.doc(`transactions/${payload.id}`)
      const snapshot = await docRef.get()
      const current = (snapshot.data() || {}) as TransactionDoc
      if (!snapshot.exists) throw new Error('Lançamento não encontrado para atualização.')
      ensureDocBelongsToFamily(current.familyGroupId, familyGroupId, 'Lançamento')
      await docRef.set(base, { merge: true })
      return payload.id
    }

    const created = await db.collection('transactions').add({ ...base, createdAt: now })
    return created.id
  } catch (error) {
    logFirestoreError('transactions.upsert', error, { uid, transactionId: payload.id || null })
    throw new Error(mapFirestoreError(payload.id ? 'atualizar' : 'salvar', error))
  }
}

export async function deleteTransaction(uid: string, transactionId: string) {
  try {
    const { familyGroupId } = await resolveFamilyGroupId(uid)
    const db = await getFirestoreClient()
    const docRef = db.doc(`transactions/${transactionId}`)
    const snapshot = await docRef.get()
    const data = (snapshot.data() || {}) as TransactionDoc

    if (!snapshot.exists || data.familyGroupId !== familyGroupId) {
      throw new Error('Lançamento não encontrado para este grupo familiar.')
    }

    await docRef.delete()
  } catch (error) {
    logFirestoreError('transactions.delete', error, { uid, transactionId })
    throw new Error(mapFirestoreError('excluir', error))
  }
}

export async function getMonthlyTransactionsSummary(uid: string, referenceDate = new Date()) {
  const transactions = await listTransactions(uid)
  const monthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`
  const monthlyRows = transactions.filter((item) => item.date.startsWith(monthKey) && item.status === 'posted')

  const revenuesTotal = monthlyRows.filter((item) => item.type === 'income').reduce((acc, item) => acc + item.amount, 0)
  const expensesTotal = monthlyRows.filter((item) => item.type === 'expense').reduce((acc, item) => acc + item.amount, 0)

  return {
    revenuesTotal,
    expensesTotal,
    recentTransactions: monthlyRows.slice(0, 8),
    hasAnyData: monthlyRows.length > 0,
  }
}
