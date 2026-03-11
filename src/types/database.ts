export type FamilyRole = 'proprietario' | 'administrador' | 'convidado_editor'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  familyGroupId: string | null
  createdAt: string
  updatedAt: string
}

export interface FamilyGroup {
  id: string
  name: string
  ownerUid: string
  createdAt: string
  updatedAt: string
}

export interface FamilyMember {
  id: string
  familyGroupId: string
  uid: string
  role: FamilyRole
  createdAt: string
  updatedAt: string
}

export interface FamilyInvite {
  id: string
  familyGroupId: string
  email: string
  role: FamilyRole
  status: 'pending' | 'accepted' | 'cancelled'
  invitedByUid: string
  createdAt: string
  updatedAt: string
}

export interface FamilyMemberSummary {
  uid: string
  displayName: string
  role: FamilyRole
}

export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  familyGroupId: string
  name: string
  type: CategoryType
  color: string | null
  icon: string | null
  parentCategoryId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AccountType = 'checking' | 'wallet' | 'savings' | 'cash'

export interface Account {
  id: string
  familyGroupId: string
  name: string
  type: AccountType
  initialBalance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type TransactionType = 'income' | 'expense'
export type TransactionStatus = 'posted'

export interface Transaction {
  id: string
  familyGroupId: string
  type: TransactionType
  description: string
  amount: number
  date: string
  categoryId: string
  accountId: string
  memberUid: string
  notes: string
  status: TransactionStatus
  createdAt: string
  updatedAt: string
}
