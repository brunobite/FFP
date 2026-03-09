export type FamilyRole = 'owner' | 'adult' | 'member'

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
