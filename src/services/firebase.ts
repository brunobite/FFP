import { firebase, getAuthStorageKey } from '@/lib/firebase/config'

export interface AuthUser {
  uid: string
  email: string
  displayName: string
  idToken: string
  refreshToken: string
}

interface FirebaseAuthErrorPayload {
  error?: {
    message?: string
  }
}

interface RefreshTokenPayload {
  id_token?: string
  refresh_token?: string
  user_id?: string
}

function parseFirebaseError(errorCode?: string) {
  switch (errorCode) {
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'E-mail ou senha inválidos.'
    case 'USER_DISABLED':
      return 'Esta conta foi desativada.'
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Muitas tentativas. Tente novamente mais tarde.'
    case 'INVALID_ID_TOKEN':
    case 'TOKEN_EXPIRED':
      return 'Sua sessão expirou. Faça login novamente.'
    case 'EMAIL_EXISTS':
      return 'Este e-mail já está em uso.'
    case 'WEAK_PASSWORD':
      return 'A senha informada é fraca demais.'
    default:
      return 'Não foi possível concluir a autenticação agora.'
  }
}

function buildAuthUser(payload: Record<string, string>): AuthUser {
  return {
    uid: payload.localId || payload.user_id || '',
    email: payload.email || '',
    displayName: payload.displayName || 'Usuário',
    idToken: payload.idToken || payload.id_token || '',
    refreshToken: payload.refreshToken || payload.refresh_token || '',
  }
}

async function parseAuthError(response: Response) {
  const data = (await response.json().catch(() => null)) as FirebaseAuthErrorPayload | null
  const code = data?.error?.message ?? 'UNKNOWN'
  return parseFirebaseError(code)
}

async function authRequest<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${firebase.identityBaseUrl}/${endpoint}?key=${firebase.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await parseAuthError(response))
  }

  return (await response.json()) as T
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

export async function refreshSession(saved: AuthUser): Promise<AuthUser> {
  if (!saved.refreshToken) {
    throw new Error('Sessão inválida. Faça login novamente.')
  }

  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${firebase.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(saved.refreshToken)}`,
  })

  if (!response.ok) {
    clearSession()
    throw new Error(await parseAuthError(response))
  }

  const tokenData = (await response.json()) as RefreshTokenPayload
  const nextUser: AuthUser = {
    ...saved,
    uid: tokenData.user_id || saved.uid,
    idToken: tokenData.id_token || saved.idToken,
    refreshToken: tokenData.refresh_token || saved.refreshToken,
  }

  const lookup = await authRequest<{ users: Array<Record<string, string>> }>('accounts:lookup', { idToken: nextUser.idToken })
  const first = lookup.users?.[0]
  if (!first) {
    throw new Error('Não foi possível restaurar a sessão do usuário.')
  }

  const hydrated = {
    ...nextUser,
    email: first.email || nextUser.email,
    displayName: first.displayName || nextUser.displayName || 'Usuário',
  }

  saveSession(hydrated)
  return hydrated
}

export async function sendPasswordReset(email: string) {
  await authRequest('accounts:sendOobCode', {
    requestType: 'PASSWORD_RESET',
    email,
  })
}
