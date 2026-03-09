import { firebase, getAuthStorageKey } from '@/lib/firebase/config'

export interface AuthUser {
  uid: string
  email: string
  displayName: string
  idToken: string
  refreshToken: string
}

interface FirestoreDocument {
  name: string
  fields?: Record<string, unknown>
}

function parseFirebaseError(errorCode?: string) {
  switch (errorCode) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
      return 'E-mail ou senha inválidos.'
    default:
      return 'Não foi possível concluir a autenticação agora.'
  }
}

function buildAuthUser(payload: Record<string, string>): AuthUser {
  return {
    uid: payload.localId || '',
    email: payload.email || '',
    displayName: payload.displayName || 'Usuário',
    idToken: payload.idToken || '',
    refreshToken: payload.refreshToken || '',
  }
}

async function authRequest<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${firebase.identityBaseUrl}/${endpoint}?key=${firebase.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (!response.ok) {
    const code = (data?.error?.message as string | undefined) ?? 'UNKNOWN'
    throw new Error(parseFirebaseError(code))
  }
  return data as T
}

function parseStringField(field: unknown) {
  if (field && typeof field === 'object' && 'stringValue' in field) {
    return String((field as { stringValue: string }).stringValue)
  }
  return ''
}

function parseNullStringField(field: unknown) {
  const value = parseStringField(field)
  return value || null
}

export function saveSession(user: AuthUser) {
  localStorage.setItem(getAuthStorageKey(), JSON.stringify(user))
}

export function loadSession(): AuthUser | null {
  const raw = localStorage.getItem(getAuthStorageKey())
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(getAuthStorageKey())
}

export async function signInWithEmail(email: string, password: string) {
  const data = await authRequest<Record<string, string>>('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  })

  const user = buildAuthUser(data)
  saveSession(user)
  return user
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const data = await authRequest<Record<string, string>>('accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  })

  const profileData = await authRequest<Record<string, string>>('accounts:update', {
    idToken: data.idToken,
    displayName,
    returnSecureToken: true,
  })

  const user = buildAuthUser(profileData)
  saveSession(user)
  return user
}

export async function fetchCurrentUser(idToken: string) {
  const data = await authRequest<{ users: Array<Record<string, string>> }>('accounts:lookup', { idToken })
  const first = data.users?.[0]
  if (!first) return null

  return {
    uid: first.localId,
    email: first.email,
    displayName: first.displayName || 'Usuário',
    idToken,
    refreshToken: '',
  } as AuthUser
}

export async function sendPasswordReset(email: string) {
  await authRequest('accounts:sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email,
  })
}

function buildFields(values: Record<string, string | null>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, { stringValue: value ?? '' }]),
  )
}

export async function upsertUserProfile(params: { uid: string; email: string; displayName: string; idToken: string }) {
  const endpoint = `${firebase.firestoreBaseUrl}/users/${params.uid}`

  await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify({
      fields: buildFields({
        uid: params.uid,
        email: params.email,
        displayName: params.displayName,
        photoURL: null,
        familyGroupId: null,
        updatedAt: new Date().toISOString(),
      }),
    }),
  })
}

export async function readUserProfile(uid: string, idToken: string) {
  const response = await fetch(`${firebase.firestoreBaseUrl}/users/${uid}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })

  if (!response.ok) return null

  const data = (await response.json()) as FirestoreDocument
  const fields = data.fields || {}

  return {
    uid,
    email: parseStringField(fields.email),
    displayName: parseStringField(fields.displayName) || 'Usuário',
    photoURL: parseNullStringField(fields.photoURL),
    familyGroupId: parseNullStringField(fields.familyGroupId),
    createdAt: parseStringField(fields.createdAt) || new Date().toISOString(),
    updatedAt: parseStringField(fields.updatedAt) || new Date().toISOString(),
  }
}
