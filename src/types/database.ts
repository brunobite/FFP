export type FamilyRole = 'admin' | 'editor' | 'viewer'

export type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface FamilyGroup {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_group_id: string
  user_id: string
  role: FamilyRole
  joined_at: string
}

export interface FamilyInvite {
  id: string
  family_group_id: string
  invited_by: string
  email: string
  status: InviteStatus
  created_at: string
  expires_at: string
}
