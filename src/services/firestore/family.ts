import { getFirestoreClient } from '@/lib/firebase/sdk'
import { loadSession } from '@/services/firebase'
import { classifyFirestoreFailure, getFirestoreErrorCode, isFirestoreOfflineError, logFirestoreError } from '@/services/firestore/errors'
import type { FamilyGroup, FamilyInvite, FamilyMember, FamilyRole, UserProfile } from '@/types/database'

interface ProfileDoc {
  uid?: string
  email?: string
  displayName?: string
  photoURL?: string | null
  familyGroupId?: string | null
  role?: string | null
  setupCompleted?: boolean
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
  role?: string
  createdAt?: string
  updatedAt?: string
}

interface FamilyInviteDoc {
  familyGroupId?: string
  email?: string
  role?: FamilyRole
  status?: 'pending' | 'accepted' | 'cancelled'
  invitedByUid?: string
  createdAt?: string
  updatedAt?: string
}

const bootstrapInFlight = new Map<string, Promise<void>>()
const bootstrapDone = new Set<string>()
const fetchFamilyInFlight = new Map<string, Promise<{ group: FamilyGroup | null; members: FamilyMember[]; memberRole: FamilyRole | null }>>()


function getOnlineStatus() {
  return typeof navigator !== 'undefined' ? navigator.onLine : undefined
}

function nowIso() {
  return new Date().toISOString()
}

function mapLegacyRole(role: string | undefined): FamilyRole {
  if (role === 'owner' || role === 'proprietario') return 'proprietario'
  if (role === 'adult' || role === 'administrador') return 'administrador'
  return 'convidado_editor'
}

function canManageFamily(role: FamilyRole | null) {
  return role === 'proprietario' || role === 'administrador'
}

function createDefaultProfile(params: { uid: string; email: string; displayName?: string | null }): UserProfile {
  const now = nowIso()
  return {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName ?? 'Usuário',
    photoURL: null,
    familyGroupId: null,
    role: null,
    setupCompleted: false,
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
    role: data?.role ? mapLegacyRole(data.role) : null,
    setupCompleted: data?.setupCompleted ?? false,
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
  uid?: string,
) {
  try {
    const result = await ref.get({ source: 'server' })
    console.info(`[firestore][read] ${label} via server`, { uid: uid || null, online: getOnlineStatus(), source: 'server' })
    return { result, source: 'server' as const }
  } catch (serverError) {
    const code = getFirestoreErrorCode(serverError)
    if (!isFirestoreOfflineError(serverError)) {
      logFirestoreError('firestore.read.server', serverError, {
        uid: uid || null,
        path: label,
        source: 'server',
      })
      throw serverError
    }

    console.info(`[firestore][read] ${label} fallback para cache`, {
      uid: uid || null,
      online: getOnlineStatus(),
      source: 'cache',
      code,
      diagnosis: classifyFirestoreFailure(serverError),
      reason: (serverError as { message?: string })?.message,
      path: label,
    })

    try {
      const result = await ref.get({ source: 'cache' })
      return { result, source: 'cache' as const }
    } catch (cacheError) {
      logFirestoreError('firestore.read.cache', cacheError, {
        uid: uid || null,
        path: label,
        source: 'cache',
      })
      throw cacheError
    }
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = await getUserDocRef(uid)
  const { result: snapshot } = await readDocWithFallback(userRef, `users/${uid}`, uid)
  const typed = snapshot as Awaited<ReturnType<typeof userRef.get>>

  if (!typed.exists) return null

  return normalizeProfile(uid, typed.data() as ProfileDoc | undefined)
}

export async function ensureUserProfile(params: { uid: string; email: string; displayName?: string | null }) {
  const userRef = await getUserDocRef(params.uid)
  const { result: existing } = await readDocWithFallback(userRef, `users/${params.uid}`, params.uid)
  const typedExisting = existing as Awaited<ReturnType<typeof userRef.get>>

  if (!typedExisting.exists) {
    if (!navigator.onLine) {
      const err = new Error('Firestore indisponível no primeiro acesso sem cache local.') as Error & { code: string }
      err.code = 'unavailable'
      throw err
    }

    const base = createDefaultProfile(params)
    await userRef.set({ ...base }, { merge: true })
    return base
  }

  const current = normalizeProfile(params.uid, typedExisting.data() as ProfileDoc | undefined, params)
  const nextDisplayName = params.displayName || current.displayName || 'Usuário'

  const updates: Partial<UserProfile> = {}
  if (current.email !== params.email) updates.email = params.email
  if (current.displayName !== nextDisplayName) updates.displayName = nextDisplayName

  if (Object.keys(updates).length > 0) {
    await userRef.set({ ...updates, updatedAt: nowIso() }, { merge: true })
  }

  const refreshed = await userRef.get()
  return normalizeProfile(params.uid, refreshed.data() as ProfileDoc | undefined, params)
}

export async function createFamilyGroup(params: { uid: string; name: string }) {
  const session = loadSession()
  if (!session?.email) {
    throw new Error('Sessão inválida para criar família.')
  }

  const profile = await ensureUserProfile({
    uid: params.uid,
    email: session.email,
    displayName: session.displayName,
  })

  if (profile.familyGroupId) {
    return profile.familyGroupId
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
      role: 'proprietario' as FamilyRole,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  )

  await (await getUserDocRef(params.uid)).set({ familyGroupId: groupRef.id, setupCompleted: true, role: 'proprietario', updatedAt: now }, { merge: true })

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
      console.info('[firestore][bootstrap] família recuperada de family_members', { uid: params.uid, familyGroupId })
    }
  }

  if (!familyGroupId) {
    console.info('[firestore][bootstrap] primeiro acesso sem família; aguardando configuração inicial', { uid: params.uid })
    return
  }

  const groupRef = db.doc(`family_groups/${familyGroupId}`)
  const groupSnapshot = await groupRef.get({ source: 'server' })
  if (!groupSnapshot.exists && navigator.onLine) {
    await groupRef.set(
      {
        name: params.displayName?.trim() ? `Família de ${params.displayName.trim()}` : 'Minha Família',
        ownerUid: params.uid,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    )
  }

  const memberRef = db.doc(`family_members/${params.uid}_${familyGroupId}`)
  const memberSnapshot = await memberRef.get({ source: 'server' })
  if (!memberSnapshot.exists && navigator.onLine) {
    await memberRef.set(
      {
        familyGroupId,
        uid: params.uid,
        role: 'proprietario' as FamilyRole,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    )
  }
}

export async function ensureInitialFamilyBootstrap(params: { uid: string; email: string; displayName?: string | null }) {
  if (bootstrapDone.has(params.uid)) return

  const inFlight = bootstrapInFlight.get(params.uid)
  if (inFlight) return inFlight

  const promise = runInitialFamilyBootstrap(params)
    .then(() => {
      bootstrapDone.add(params.uid)
    })
    .finally(() => bootstrapInFlight.delete(params.uid))

  bootstrapInFlight.set(params.uid, promise)
  return promise
}

async function getCurrentMemberRole(uid: string, familyGroupId: string): Promise<FamilyRole | null> {
  const db = await getFirestoreClient()
  const memberSnapshot = await db.doc(`family_members/${uid}_${familyGroupId}`).get()
  if (!memberSnapshot.exists) return null
  const memberDoc = (memberSnapshot.data() || {}) as FamilyMemberDoc
  return mapLegacyRole(memberDoc.role)
}

export async function getFamilyByUser(uid: string): Promise<{ group: FamilyGroup | null; members: FamilyMember[]; memberRole: FamilyRole | null }> {
  const inFlight = fetchFamilyInFlight.get(uid)
  if (inFlight) return inFlight

  const promise = (async () => {
    const profile = await getUserProfile(uid)
    if (!profile?.familyGroupId) {
      return { group: null, members: [], memberRole: null }
    }

    const db = await getFirestoreClient()
    const groupSnapshot = await db.doc(`family_groups/${profile.familyGroupId}`).get()
    if (!groupSnapshot.exists) {
      return { group: null, members: [], memberRole: null }
    }

    const groupDoc = (groupSnapshot.data() || {}) as FamilyGroupDoc
    const membersSnapshot = await db.collection('family_members').where('familyGroupId', '==', profile.familyGroupId).get()

    const members: FamilyMember[] = membersSnapshot.docs.map((member) => {
      const data = (member.data() || {}) as FamilyMemberDoc
      return {
        id: member.id,
        familyGroupId: data.familyGroupId || profile.familyGroupId!,
        uid: data.uid || '',
        role: mapLegacyRole(data.role),
        createdAt: data.createdAt || nowIso(),
        updatedAt: data.updatedAt || nowIso(),
      }
    })

    const memberRole = members.find((member) => member.uid === uid)?.role ?? null

    return {
      group: {
        id: groupSnapshot.id,
        name: groupDoc.name || 'Família',
        ownerUid: groupDoc.ownerUid || '',
        createdAt: groupDoc.createdAt || nowIso(),
        updatedAt: groupDoc.updatedAt || nowIso(),
      },
      members,
      memberRole,
    }
  })().finally(() => {
    fetchFamilyInFlight.delete(uid)
  })

  fetchFamilyInFlight.set(uid, promise)
  return promise
}

export async function updateFamilyGroup(params: { uid: string; familyGroupId: string; name: string }) {
  const role = await getCurrentMemberRole(params.uid, params.familyGroupId)
  if (!canManageFamily(role)) {
    const error = new Error('Sem permissão para editar dados da família.') as Error & { code: string }
    error.code = 'permission-denied'
    throw error
  }

  const db = await getFirestoreClient()
  await db.doc(`family_groups/${params.familyGroupId}`).set({ name: params.name, updatedAt: nowIso() }, { merge: true })
}

export async function createFamilyInvite(params: { uid: string; familyGroupId: string; email: string; role: FamilyRole }) {
  const role = await getCurrentMemberRole(params.uid, params.familyGroupId)
  if (!canManageFamily(role)) {
    const error = new Error('Sem permissão para convidar membros.') as Error & { code: string }
    error.code = 'permission-denied'
    throw error
  }

  const db = await getFirestoreClient()
  const now = nowIso()
  const existing = await db.collection('family_invites').where('familyGroupId', '==', params.familyGroupId).get()
  const duplicate = existing.docs.some((doc) => {
    const data = (doc.data() || {}) as FamilyInviteDoc
    return data.email?.toLowerCase() === params.email.toLowerCase() && data.status === 'pending'
  })

  if (duplicate) {
    const error = new Error('Já existe convite pendente para este e-mail.') as Error & { code: string }
    error.code = 'already-exists'
    throw error
  }

  await db.collection('family_invites').add({
    familyGroupId: params.familyGroupId,
    email: params.email.toLowerCase(),
    role: params.role,
    status: 'pending',
    invitedByUid: params.uid,
    createdAt: now,
    updatedAt: now,
  })
}

export async function listFamilyInvites(familyGroupId: string): Promise<FamilyInvite[]> {
  const db = await getFirestoreClient()
  const snapshot = await db.collection('family_invites').where('familyGroupId', '==', familyGroupId).get()

  return snapshot.docs.map((doc) => {
    const data = (doc.data() || {}) as FamilyInviteDoc
    return {
      id: doc.id,
      familyGroupId: data.familyGroupId || familyGroupId,
      email: data.email || '',
      role: data.role || 'convidado_editor',
      status: data.status || 'pending',
      invitedByUid: data.invitedByUid || '',
      createdAt: data.createdAt || nowIso(),
      updatedAt: data.updatedAt || nowIso(),
    }
  })
}

export async function updateFamilyMemberRole(params: { actorUid: string; member: FamilyMember; nextRole: FamilyRole }) {
  const actorRole = await getCurrentMemberRole(params.actorUid, params.member.familyGroupId)
  if (!canManageFamily(actorRole)) {
    const error = new Error('Sem permissão para gerenciar papéis da família.') as Error & { code: string }
    error.code = 'permission-denied'
    throw error
  }

  if (params.member.uid === params.actorUid && params.nextRole !== 'proprietario' && actorRole === 'proprietario') {
    const error = new Error('O proprietário não pode remover seu próprio papel.') as Error & { code: string }
    error.code = 'failed-precondition'
    throw error
  }

  const db = await getFirestoreClient()
  await db.doc(`family_members/${params.member.id}`).set({ role: params.nextRole, updatedAt: nowIso() }, { merge: true })
}

export function reportFamilyError(context: string, error: unknown, extra?: Record<string, unknown>) {
  logFirestoreError(context, error, extra)
}
