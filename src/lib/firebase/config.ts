interface FirebaseRuntimeConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

interface FirebaseStorageDiagnostics {
  normalizedStorageBucket: string
  bucketProjectId: string | null
  projectIdMatchesBucket: boolean
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

function normalizeStorageBucket(rawBucket: string): string {
  return rawBucket
    .replace(/^gs:\/\//, '')
    .replace(/^https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\//, '')
    .replace(/\/.*$/, '')
    .trim()
}

function getBucketProjectId(bucket: string): string | null {
  if (bucket.endsWith('.appspot.com')) {
    return bucket.replace(/\.appspot\.com$/, '')
  }

  if (bucket.endsWith('.firebasestorage.app')) {
    return bucket.replace(/\.firebasestorage\.app$/, '')
  }

  return null
}

function buildStorageDiagnostics(projectId: string, storageBucket: string): FirebaseStorageDiagnostics {
  const normalizedStorageBucket = normalizeStorageBucket(storageBucket)
  const bucketProjectId = getBucketProjectId(normalizedStorageBucket)
  const projectIdMatchesBucket = bucketProjectId === null ? true : bucketProjectId === projectId

  return {
    normalizedStorageBucket,
    bucketProjectId,
    projectIdMatchesBucket,
  }
}

const rawFirebaseConfig: FirebaseRuntimeConfig = {
  apiKey: getRequiredSanitizedEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getRequiredSanitizedEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredSanitizedEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getRequiredSanitizedEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getRequiredSanitizedEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getRequiredSanitizedEnv('VITE_FIREBASE_APP_ID'),
}

const storageDiagnostics = buildStorageDiagnostics(rawFirebaseConfig.projectId, rawFirebaseConfig.storageBucket)

export const firebaseConfig: FirebaseRuntimeConfig = {
  ...rawFirebaseConfig,
  storageBucket: storageDiagnostics.normalizedStorageBucket,
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
    bucketProjectId: JSON.stringify(storageDiagnostics.bucketProjectId),
    projectIdMatchesBucket: storageDiagnostics.projectIdMatchesBucket,
  }
}

if (!storageDiagnostics.projectIdMatchesBucket) {
  console.error('[firebase][config] projectId e storageBucket divergem; uploads no Storage podem falhar com 403/permission-denied.', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    bucketProjectId: storageDiagnostics.bucketProjectId,
    recommendation: 'Atualize VITE_FIREBASE_STORAGE_BUCKET para o bucket do mesmo projeto do VITE_FIREBASE_PROJECT_ID e force refresh no PWA.',
  })
}

export const firebase = {
  ...firebaseConfig,
  identityBaseUrl: 'https://identitytoolkit.googleapis.com/v1',
  storageBaseUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}`,
}

export function getAuthStorageKey() {
  return `ffp_auth_${firebase.projectId}`
}
