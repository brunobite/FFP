interface FirebaseRuntimeConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

type FirebaseEnvKey = keyof Pick<ImportMetaEnv,
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'
  | 'VITE_FIREBASE_APP_ID'
>

function getRequiredSanitizedEnv(key: FirebaseEnvKey): string {
  const value = import.meta.env[key]
  const sanitized = typeof value === 'string' ? value.trim() : ''

  if (!sanitized) {
    throw new Error(`[firebase] variável obrigatória ausente ou vazia após trim(): ${key}`)
  }

  return sanitized
}

export const firebaseConfig: FirebaseRuntimeConfig = {
  apiKey: getRequiredSanitizedEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getRequiredSanitizedEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredSanitizedEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getRequiredSanitizedEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredSanitizedEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getRequiredSanitizedEnv('VITE_FIREBASE_APP_ID'),
}

function maskApiKey(apiKey: string): string {
  const suffix = apiKey.slice(-6)
  return `***${suffix}`
}

export function getFirebaseRuntimeLogPayload() {
  return {
    projectId: JSON.stringify(firebaseConfig.projectId),
    authDomain: JSON.stringify(firebaseConfig.authDomain),
    appId: JSON.stringify(firebaseConfig.appId),
    storageBucket: JSON.stringify(firebaseConfig.storageBucket),
    messagingSenderId: JSON.stringify(firebaseConfig.messagingSenderId),
    apiKeyMasked: maskApiKey(firebaseConfig.apiKey),
  }
}

export const firebase = {
  ...firebaseConfig,
  identityBaseUrl: 'https://identitytoolkit.googleapis.com/v1',
  storageBaseUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}`,
}

export function getAuthStorageKey() {
  return `ffp_auth_${firebase.projectId}`
}
