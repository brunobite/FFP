import { firebase } from '@/lib/firebase/config'
import { loadSession } from '@/services/firebase'
import type { FamilyGroup, FamilyMember, FamilyRole, UserProfile } from '@/types/database'

interface FirestoreErrorPayload {
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

function field(value: string) {
  return { stringValue: value }
}

function parseField(value: unknown) {
  if (value && typeof value === 'object' && 'stringValue' in value) {
    return String((value as { stringValue: string }).stringValue)
  }
  return ''
}

function getToken() {
  const session = loadSession()
  if (!session?.idToken) throw new Error('Usuário não autenticado')
  return session.idToken
}

export function getFirestoreBaseUrl() {
  if (!firebase.projectId) {
    throw new Error('Configuração do Firebase inválida: VITE_FIREBASE_PROJECT_ID não definido no build.')
  }

  return firebase.firestoreBaseUrl
}

function buildDocumentPath(path: string) {
  const normalized = path.trim().replace(/^\/+/, '')
  if (!normalized) {
    throw new Error('Tentativa de consultar caminho vazio no Firestore.')
  }

  return `${getFirestoreBaseUrl()}/${normalized}`
}

function createDefaultProfile(params: { uid: string; email: string; displayName?: string | null }): UserProfile {
  const now = new Date().toISOString()
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

async function authorizedFetch(url: string, init?: RequestInit) {
  const token = getToken()
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  })
}

async function parseFirestoreError(response: Response) {
  const payload = (await response.json().catch(() => null)) as FirestoreErrorPayload | null
  return payload?.error?.message || `Erro Firestore ${response.status}`
}

export async function ensureUserProfile(params: { uid: string; email: string; displayName?: string | null }) {
  const now = new Date().toISOString()
  const response = await authorizedFetch(buildDocumentPath(`users/${params.uid}`), {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        uid: field(params.uid),
        email: field(params.email),
        displayName: field(params.displayName ?? 'Usuário'),
        photoURL: field(''),
        familyGroupId: field(''),
        createdAt: field(now),
        updatedAt: field(now),
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Não foi possível inicializar perfil do usuário: ${await parseFirestoreError(response)}`)
  }

  return {
    ...createDefaultProfile(params),
    createdAt: now,
    updatedAt: now,
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const response = await authorizedFetch(buildDocumentPath(`users/${uid}`))
  if (response.status === 404) return null
  if (!response.ok) return null

  const data = (await response.json()) as { fields?: Record<string, unknown> }
  const fields = data.fields || {}

  return {
    uid,
    email: parseField(fields.email),
    displayName: parseField(fields.displayName) || 'Usuário',
    photoURL: parseField(fields.photoURL) || null,
    familyGroupId: parseField(fields.familyGroupId) || null,
    createdAt: parseField(fields.createdAt) || new Date().toISOString(),
    updatedAt: parseField(fields.updatedAt) || new Date().toISOString(),
  }
}

export async function createFamilyGroup(params: { uid: string; name: string }) {
  const now = new Date().toISOString()
  const groupResponse = await authorizedFetch(buildDocumentPath('family_groups'), {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        name: field(params.name),
        ownerUid: field(params.uid),
        createdAt: field(now),
        updatedAt: field(now),
      },
    }),
  })

  if (!groupResponse.ok) {
    throw new Error(`Não foi possível criar grupo familiar: ${await parseFirestoreError(groupResponse)}`)
  }

  const groupData = (await groupResponse.json()) as { name: string }
  const groupId = groupData.name.split('/').pop() || ''

  const memberResponse = await authorizedFetch(buildDocumentPath('family_members'), {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        familyGroupId: field(groupId),
        uid: field(params.uid),
        role: field('owner'),
        createdAt: field(now),
        updatedAt: field(now),
      },
    }),
  })

  if (!memberResponse.ok) {
    throw new Error(`Não foi possível criar membro da família: ${await parseFirestoreError(memberResponse)}`)
  }

  const userResponse = await authorizedFetch(
    `${buildDocumentPath(`users/${params.uid}`)}?updateMask.fieldPaths=familyGroupId&updateMask.fieldPaths=updatedAt`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          familyGroupId: field(groupId),
          updatedAt: field(now),
        },
      }),
    },
  )

  if (!userResponse.ok) {
    throw new Error(`Não foi possível vincular usuário ao grupo: ${await parseFirestoreError(userResponse)}`)
  }

  return groupId
}

export async function ensureInitialFamilyBootstrap(params: { uid: string; email: string; displayName?: string | null }) {
  const profile = await getUserProfile(params.uid)

  if (!profile) {
    await ensureUserProfile(params)
  }

  const latestProfile = (await getUserProfile(params.uid)) ?? createDefaultProfile(params)
  if (latestProfile.familyGroupId) {
    const family = await getFamilyByUser(params.uid)
    if (family.group && family.members.length > 0) {
      return
    }
  }

  await createFamilyGroup({ uid: params.uid, name: 'Minha Família' })
}

export async function getFamilyByUser(uid: string): Promise<{ group: FamilyGroup | null; members: FamilyMember[] }> {
  const profile = await getUserProfile(uid)
  if (!profile?.familyGroupId) return { group: null, members: [] }

  const groupResponse = await authorizedFetch(buildDocumentPath(`family_groups/${profile.familyGroupId}`))
  if (groupResponse.status === 404) {
    console.warn(`[family] grupo familiar não encontrado para familyGroupId=${profile.familyGroupId}`)
    return { group: null, members: [] }
  }

  if (!groupResponse.ok) {
    throw new Error(`Falha ao carregar grupo familiar: ${await parseFirestoreError(groupResponse)}`)
  }

  const groupJson = (await groupResponse.json()) as { fields?: Record<string, unknown> }
  const groupFields = groupJson.fields || {}

  const memberResponse = await authorizedFetch(`${getFirestoreBaseUrl()}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'family_members' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'familyGroupId' },
            op: 'EQUAL',
            value: field(profile.familyGroupId),
          },
        },
      },
    }),
  })

  if (!memberResponse.ok) {
    throw new Error(`Falha ao carregar membros da família: ${await parseFirestoreError(memberResponse)}`)
  }

  const memberJson = (await memberResponse.json()) as Array<{ document?: { name: string; fields?: Record<string, unknown> } }>
  const members: FamilyMember[] = memberJson
    .filter((item) => item.document)
    .map((item) => {
      const document = item.document!
      const fields = document.fields || {}
      return {
        id: document.name.split('/').pop() || '',
        familyGroupId: parseField(fields.familyGroupId),
        uid: parseField(fields.uid),
        role: (parseField(fields.role) as FamilyRole) || 'member',
        createdAt: parseField(fields.createdAt),
        updatedAt: parseField(fields.updatedAt),
      }
    })

  return {
    group: {
      id: profile.familyGroupId,
      name: parseField(groupFields.name) || 'Família',
      ownerUid: parseField(groupFields.ownerUid),
      createdAt: parseField(groupFields.createdAt),
      updatedAt: parseField(groupFields.updatedAt),
    },
    members,
  }
}
