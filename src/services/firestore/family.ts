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

const bootstrapInFlight = new Map<string, Promise<void>>()
const bootstrapDone = new Set<string>()

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

async function readDocWithFallback<T extends { get: (options?: { source?: 'default' | 'server' | 'cache' }) => Promise<unknown> }>(
  ref: T,
  label: string,
) {
  try {
    const result = await ref.get({ source: 'server' })
    console.info(`[firestore][read] ${label} via server`, { online: navigator.onLine })
    return { result, source: 'server' as const }
  } catch (serverError) {
    if (!isFirestoreOfflineError(serverError)) {
      throw serverError
    }

    console.info(`[firestore][read] ${label} fallback para cache por indisponibilidade remota`, {
      online: navigator.onLine,
      reason: (serverError as { message?: string })?.message,
    })

    try {
      const result = await ref.get({ source: 'cache' })
      console.info(`[firestore][read] ${label} via cache`, { online: navigator.onLine })
      return { result, source: 'cache' as const }
    } catch {
      throw serverError
    }
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = await getUserDocRef(uid)
  const { result: snapshot } = await readDocWithFallback(userRef, `users/${uid}`)
  const typed = snapshot as Awaited<ReturnType<typeof userRef.get>>

  if (!typed.exists) {
    return null
  }

  return normalizeProfile(uid, typed.data() as ProfileDoc | undefined)
}

export async function ensureUserProfile(params: { uid: string; email: string; displayName?: string | null }) {
  const userRef = await getUserDocRef(params.uid)
  const { result: existing } = await readDocWithFallback(userRef, `users/${params.uid}`)
  const typedExisting = existing as Awaited<ReturnType<typeof userRef.get>>

  if (!typedExisting.exists) {
    if (!navigator.onLine) {
      const err = new Error('Firestore indisponível no primeiro acesso sem cache local.') as Error & { code: string }
      err.code = 'unavailable'
      throw err
    }

    const base = createDefaultProfile(params)
    await userRef.set({
      ...base,
      displayName: params.displayName ?? 'Usuário',
      photoURL: null,
      familyGroupId: null,
    })
    return base
  }

  const current = normalizeProfile(params.uid, typedExisting.data() as ProfileDoc | undefined, params)
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

async function runInitialFamilyBootstrap(params: { uid: string; email: string; displayName?: string | null }) {
  const db = await getFirestoreClient()
  const profile = await ensureUserProfile(params)
  const now = nowIso()
  let familyGroupId = profile.familyGroupId

  if (!familyGroupId) {
    const existingMembership = await db.collection('family_members').where('uid', '==', params.uid).get({ source: 'server' })
    const memberDoc = existingMembership.docs[0]
    const memberData = (memberDoc?.data() || {}) as FamilyMemberDoc

    if (memberData.familyGroupId) {
      familyGroupId = memberData.familyGroupId
      await (await getUserDocRef(params.uid)).set({ familyGroupId, updatedAt: now }, { merge: true })
      console.info('[firestore][bootstrap] família recuperada a partir da membership existente', { uid: params.uid, familyGroupId })
    }
  }

  if (!familyGroupId) {
    console.info('[firestore][bootstrap] usuário sem familyGroupId; aguardando configuração inicial', { uid: params.uid })
    return
  }

  const groupRef = db.doc(`family_groups/${familyGroupId}`)
  const { result: groupSnapshot } = await readDocWithFallback(groupRef, `family_groups/${familyGroupId}`)
  const typedGroup = groupSnapshot as Awaited<ReturnType<typeof groupRef.get>>
  if (!typedGroup.exists && navigator.onLine) {
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
  const { result: memberSnapshot } = await readDocWithFallback(memberRef, `family_members/${params.uid}_${familyGroupId}`)
  const typedMember = memberSnapshot as Awaited<ReturnType<typeof memberRef.get>>
  if (!typedMember.exists && navigator.onLine) {
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

export async function ensureInitialFamilyBootstrap(params: { uid: string; email: string; displayName?: string | null }) {
  if (bootstrapDone.has(params.uid)) {
    return
  }

  const inFlight = bootstrapInFlight.get(params.uid)
  if (inFlight) {
    return inFlight
  }

  const promise = runInitialFamilyBootstrap(params)
    .then(() => {
      bootstrapDone.add(params.uid)
    })
    .finally(() => {
      bootstrapInFlight.delete(params.uid)
    })

  bootstrapInFlight.set(params.uid, promise)
  return promise
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
