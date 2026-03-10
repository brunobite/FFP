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

interface FirestoreDocumentResponse {
  name?: string
  fields?: Record<string, unknown>
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

function parseDocumentId(name?: string) {
  return name?.split('/').pop() || ''
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

async function getDocument(path: string): Promise<FirestoreDocumentResponse | null> {
  const response = await authorizedFetch(buildDocumentPath(path))
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Falha ao buscar documento ${path}: ${await parseFirestoreError(response)}`)
  }

  return (await response.json()) as FirestoreDocumentResponse
}

async function patchDocument(path: string, fields: Record<string, unknown>, updateMask?: string[]) {
  const params =
    updateMask && updateMask.length > 0
      ? `?${updateMask.map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`).join('&')}`
      : ''

  return authorizedFetch(`${buildDocumentPath(path)}${params}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
}

export async function ensureUserProfile(params: { uid: string; email: string; displayName?: string | null }) {
  const existing = await getUserProfile(params.uid)
  if (existing) {
    const nextDisplayName = params.displayName || existing.displayName || 'Usuário'
    const shouldUpdate = existing.email !== params.email || existing.displayName !== nextDisplayName

    if (!shouldUpdate) {
      return existing
    }

    const response = await patchDocument(
      `users/${params.uid}`,
      {
        email: field(params.email),
        displayName: field(nextDisplayName),
        updatedAt: field(new Date().toISOString()),
      },
      ['email', 'displayName', 'updatedAt'],
    )

    if (!response.ok) {
      throw new Error(`Não foi possível atualizar perfil do usuário: ${await parseFirestoreError(response)}`)
    }

    return (await getUserProfile(params.uid)) ?? createDefaultProfile(params)
  }

  const now = new Date().toISOString()
  const response = await patchDocument(`users/${params.uid}`, {
    uid: field(params.uid),
    email: field(params.email),
    displayName: field(params.displayName ?? 'Usuário'),
    photoURL: field(''),
    familyGroupId: field(''),
    createdAt: field(now),
    updatedAt: field(now),
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
  const profile = await getUserProfile(params.uid)
  if (!profile) {
    const session = loadSession()
    if (!session?.email) {
      throw new Error('Não foi possível criar grupo familiar sem perfil válido.')
    }

    await ensureUserProfile({
      uid: params.uid,
      email: session.email,
      displayName: session.displayName,
    })
  }

  const latestProfile = (await getUserProfile(params.uid)) ?? null

  if (latestProfile?.familyGroupId) {
    const existingFamily = await getFamilyByUser(params.uid)
    if (existingFamily.group) {
      console.info(`[family] usuário ${params.uid} já possui grupo ${existingFamily.group.id}; criação ignorada.`)
      return existingFamily.group.id
    }
  }

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
  const groupId = parseDocumentId(groupData.name)

  const memberResponse = await patchDocument(`family_members/${params.uid}_${groupId}`, {
    familyGroupId: field(groupId),
    uid: field(params.uid),
    role: field('owner'),
    createdAt: field(now),
    updatedAt: field(now),
  })

  if (!memberResponse.ok) {
    throw new Error(`Não foi possível criar membro da família: ${await parseFirestoreError(memberResponse)}`)
  }

  const userResponse = await patchDocument(
    `users/${params.uid}`,
    {
      familyGroupId: field(groupId),
      updatedAt: field(now),
    },
    ['familyGroupId', 'updatedAt'],
  )

  if (!userResponse.ok) {
    throw new Error(`Não foi possível vincular usuário ao grupo: ${await parseFirestoreError(userResponse)}`)
  }

  return groupId
}

export async function ensureInitialFamilyBootstrap(params: { uid: string; email: string; displayName?: string | null }) {
  const profile = await ensureUserProfile(params)
  if (!profile.familyGroupId) {
    console.info(`[bootstrap] usuário ${params.uid} sem grupo familiar; mantendo estado inicial válido.`)
    return
  }

  const family = await getFamilyByUser(params.uid)
  if (!family.group) {
    console.warn(`[bootstrap] grupo ${profile.familyGroupId} ausente para ${params.uid}; aguardando recriação explícita.`)
    return
  }

  if (family.members.length === 0) {
    console.warn(`[bootstrap] grupo ${profile.familyGroupId} sem membros; criando vínculo do proprietário.`)
    const memberResponse = await patchDocument(`family_members/${params.uid}_${profile.familyGroupId}`, {
      familyGroupId: field(profile.familyGroupId),
      uid: field(params.uid),
      role: field('owner'),
      createdAt: field(new Date().toISOString()),
      updatedAt: field(new Date().toISOString()),
    })

    if (!memberResponse.ok) {
      throw new Error(`Falha ao reconstituir membro proprietário: ${await parseFirestoreError(memberResponse)}`)
    }
  }
}

export async function getFamilyByUser(uid: string): Promise<{ group: FamilyGroup | null; members: FamilyMember[] }> {
  const profile = await getUserProfile(uid)
  if (!profile) {
    console.info(`[family] perfil não encontrado para uid=${uid}; retornando estado vazio.`)
    return { group: null, members: [] }
  }

  if (!profile.familyGroupId) {
    console.info(`[family] usuário ${uid} sem familyGroupId; retornando estado inicial.`)
    return { group: null, members: [] }
  }

  const groupData = await getDocument(`family_groups/${profile.familyGroupId}`)
  if (!groupData) {
    console.warn(`[family] grupo familiar não encontrado para familyGroupId=${profile.familyGroupId}`)
    return { group: null, members: [] }
  }
  const groupFields = groupData.fields || {}

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
