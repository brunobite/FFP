import { getFirestoreClient } from '@/lib/firebase/sdk'
import { loadSession } from '@/services/firebase'
import { isFirestoreOfflineError } from '@/services/firestore/errors'
import type { FamilyGroup, FamilyMember, FamilyRole, UserProfile } from '@/types/database'

interface ProfileDoc {
  uid?: string
  email?: string
  displayName?: string
  photoURL?: string | null
  familyGroupId?: string | null
  createdAt?: string
  updatedAt?: string
}

interface FamilyGroupDoc {
  name?: string
  ownerUid?: string
  createdAt?: string
  updatedAt?: string
}

interface FamilyMemberDoc {
  familyGroupId?: string
  uid?: string
  role?: FamilyRole
  createdAt?: string
  updatedAt?: string
}

function nowIso() {
  return new Date().toISOString()
}

function createDefaultProfile(params: { uid: string; email: string; displayName?: string | null }): UserProfile {
  const now = nowIso()
  return {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName ?? 'Usuário',
    photoURL: null,
    familyGroupId: null,
    createdAt: now,
    updatedAt: now,
  }
}

function normalizeProfile(uid: string, data: ProfileDoc | undefined, fallback?: { email?: string; displayName?: string | null }): UserProfile {
  const now = nowIso()
  return {
    uid,
    email: data?.email || fallback?.email || '',
    displayName: data?.displayName || fallback?.displayName || 'Usuário',
    photoURL: data?.photoURL || null,
    familyGroupId: data?.familyGroupId || null,
    createdAt: data?.createdAt || now,
    updatedAt: data?.updatedAt || now,
  }
}

async function getUserDocRef(uid: string) {
  const db = await getFirestoreClient()
  return db.doc(`users/${uid}`)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = await getUserDocRef(uid)
  let snapshot = await userRef.get()

  if (!snapshot.exists) {
    try {
      snapshot = await userRef.get({ source: 'cache' })
    } catch (cacheError) {
      if (!isFirestoreOfflineError(cacheError)) {
        throw cacheError
      }
    }
  }

  if (!snapshot.exists) {
    return null
  }

  return normalizeProfile(uid, snapshot.data() as ProfileDoc | undefined)
}

export async function ensureUserProfile(params: { uid: string; email: string; displayName?: string | null }) {
  const userRef = await getUserDocRef(params.uid)
  let existing = await userRef.get()

  if (!existing.exists) {
    try {
      existing = await userRef.get({ source: 'cache' })
    } catch (cacheError) {
      if (!isFirestoreOfflineError(cacheError)) {
        throw cacheError
      }
    }
  }

  if (!existing.exists) {
    const base = createDefaultProfile(params)
    await userRef.set({
      ...base,
      displayName: params.displayName ?? 'Usuário',
      photoURL: null,
      familyGroupId: null,
    })
    return base
  }

  const current = normalizeProfile(params.uid, existing.data() as ProfileDoc | undefined, params)
  const nextDisplayName = params.displayName || current.displayName || 'Usuário'

  const updates: Partial<UserProfile> = {}
  if (current.email !== params.email) updates.email = params.email
  if (current.displayName !== nextDisplayName) updates.displayName = nextDisplayName

  if (Object.keys(updates).length > 0) {
    await userRef.set(
      {
        ...updates,
        updatedAt: nowIso(),
      },
      { merge: true },
    )
  }

  const refreshed = await userRef.get()
  return normalizeProfile(params.uid, refreshed.data() as ProfileDoc | undefined, params)
}

export async function createFamilyGroup(params: { uid: string; name: string }) {
  const session = loadSession()
  if (!session?.email) {
    throw new Error('[firestore] sessão inválida para criar família.')
  }

  const profile = await ensureUserProfile({
    uid: params.uid,
    email: session.email,
    displayName: session.displayName,
  })

  if (profile.familyGroupId) {
    const existingFamily = await getFamilyByUser(params.uid)
    if (existingFamily.group) {
      console.info(`[firestore][family] usuário ${params.uid} já possui grupo ${existingFamily.group.id}; criação ignorada.`)
      return existingFamily.group.id
    }
  }

  const db = await getFirestoreClient()
  const now = nowIso()
  const groupRef = await db.collection('family_groups').add({
    name: params.name,
    ownerUid: params.uid,
    createdAt: now,
    updatedAt: now,
  })

  await db.doc(`family_members/${params.uid}_${groupRef.id}`).set(
    {
      familyGroupId: groupRef.id,
      uid: params.uid,
      role: 'owner' as FamilyRole,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  )

  await (await getUserDocRef(params.uid)).set(
    {
      familyGroupId: groupRef.id,
      updatedAt: now,
    },
    { merge: true },
  )

  return groupRef.id
}

export async function ensureInitialFamilyBootstrap(params: { uid: string; email: string; displayName?: string | null }) {
  const db = await getFirestoreClient()

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.info('[firestore][bootstrap] bootstrap remoto ignorado: cliente offline')
    return
  }

  const profile = await ensureUserProfile(params)
  const now = nowIso()
  let familyGroupId = profile.familyGroupId

  if (!familyGroupId) {
    const existingMembership = await db.collection('family_members').where('uid', '==', params.uid).get()
    const memberDoc = existingMembership.docs[0]
    const memberData = (memberDoc?.data() || {}) as FamilyMemberDoc

    if (memberData.familyGroupId) {
      familyGroupId = memberData.familyGroupId
      await (await getUserDocRef(params.uid)).set({ familyGroupId, updatedAt: now }, { merge: true })
      console.info('[firestore][bootstrap] família recuperada a partir da membership existente', { uid: params.uid, familyGroupId })
    }
  }

  if (!familyGroupId) {
    const groupName = params.displayName?.trim() ? `Família de ${params.displayName.trim()}` : 'Minha Família'
    const groupRef = await db.collection('family_groups').add({
      name: groupName,
      ownerUid: params.uid,
      createdAt: now,
      updatedAt: now,
    })
    familyGroupId = groupRef.id
    await (await getUserDocRef(params.uid)).set({ familyGroupId, updatedAt: now }, { merge: true })
    console.info('[firestore][bootstrap] novo grupo familiar criado automaticamente', { uid: params.uid, familyGroupId })
  }

  const groupRef = db.doc(`family_groups/${familyGroupId}`)
  const groupSnapshot = await groupRef.get()
  if (!groupSnapshot.exists) {
    await groupRef.set(
      {
        name: params.displayName?.trim() ? `Família de ${params.displayName.trim()}` : 'Minha Família',
        ownerUid: params.uid,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    )
    console.warn('[firestore][bootstrap] grupo ausente foi recriado para manter consistência', { uid: params.uid, familyGroupId })
  }

  const memberRef = db.doc(`family_members/${params.uid}_${familyGroupId}`)
  const memberSnapshot = await memberRef.get()
  if (!memberSnapshot.exists) {
    await memberRef.set(
      {
        familyGroupId,
        uid: params.uid,
        role: 'owner' as FamilyRole,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    )
    console.info('[firestore][bootstrap] membership do usuário criada automaticamente', { uid: params.uid, familyGroupId })
  }
}

export async function getFamilyByUser(uid: string): Promise<{ group: FamilyGroup | null; members: FamilyMember[] }> {
  const profile = await getUserProfile(uid)

  if (!profile || !profile.familyGroupId) {
    return { group: null, members: [] }
  }

  const db = await getFirestoreClient()
  const groupSnapshot = await db.doc(`family_groups/${profile.familyGroupId}`).get()

  if (!groupSnapshot.exists) {
    console.warn(`[firestore][family] grupo familiar não encontrado para familyGroupId=${profile.familyGroupId}`)
    return { group: null, members: [] }
  }

  const groupDoc = (groupSnapshot.data() || {}) as FamilyGroupDoc
  const membersSnapshot = await db.collection('family_members').where('familyGroupId', '==', profile.familyGroupId).get()

  const members: FamilyMember[] = membersSnapshot.docs.map((member) => {
    const data = (member.data() || {}) as FamilyMemberDoc
    return {
      id: member.id,
      familyGroupId: data.familyGroupId || profile.familyGroupId!,
      uid: data.uid || '',
      role: data.role || 'member',
      createdAt: data.createdAt || nowIso(),
      updatedAt: data.updatedAt || nowIso(),
    }
  })

  return {
    group: {
      id: groupSnapshot.id,
      name: groupDoc.name || 'Família',
      ownerUid: groupDoc.ownerUid || '',
      createdAt: groupDoc.createdAt || nowIso(),
      updatedAt: groupDoc.updatedAt || nowIso(),
    },
    members,
  }
}
