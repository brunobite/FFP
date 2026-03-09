import { firebase } from '@/lib/firebase/config'
import { loadSession } from '@/services/firebase'
import type { FamilyGroup, FamilyMember, FamilyRole, UserProfile } from '@/types/database'

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

export async function ensureUserProfile(params: { uid: string; email: string; displayName?: string | null }) {
  const now = new Date().toISOString()
  await authorizedFetch(`${firebase.firestoreBaseUrl}/users/${params.uid}`, {
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
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const response = await authorizedFetch(`${firebase.firestoreBaseUrl}/users/${uid}`)
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
  const groupResponse = await authorizedFetch(`${firebase.firestoreBaseUrl}/family_groups`, {
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

  const groupData = (await groupResponse.json()) as { name: string }
  const groupId = groupData.name.split('/').pop() || ''

  await authorizedFetch(`${firebase.firestoreBaseUrl}/family_members`, {
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

  await authorizedFetch(`${firebase.firestoreBaseUrl}/users/${params.uid}?updateMask.fieldPaths=familyGroupId&updateMask.fieldPaths=updatedAt`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        familyGroupId: field(groupId),
        updatedAt: field(now),
      },
    }),
  })

  return groupId
}

export async function getFamilyByUser(uid: string): Promise<{ group: FamilyGroup | null; members: FamilyMember[] }> {
  const profile = await getUserProfile(uid)
  if (!profile?.familyGroupId) return { group: null, members: [] }

  const groupResponse = await authorizedFetch(`${firebase.firestoreBaseUrl}/family_groups/${profile.familyGroupId}`)
  const groupJson = (await groupResponse.json()) as { fields?: Record<string, unknown> }
  const groupFields = groupJson.fields || {}

  const memberResponse = await authorizedFetch(
    `${firebase.firestoreBaseUrl}:runQuery`,
    {
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
    },
  )

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
