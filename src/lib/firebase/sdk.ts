import { firebase } from '@/lib/firebase/config'
import { loadSession } from '@/services/firebase'

interface FirestoreValue {
  nullValue?: null
  booleanValue?: boolean
  integerValue?: string
  doubleValue?: number
  timestampValue?: string
  stringValue?: string
  arrayValue?: { values?: FirestoreValue[] }
  mapValue?: { fields?: Record<string, FirestoreValue> }
}

interface FirestoreDocument {
  name: string
  fields?: Record<string, FirestoreValue>
}

interface FirestoreErrorPayload {
  error?: {
    status?: string
    message?: string
  }
}

type QuerySnapshot = { docs: Array<{ id: string; data: () => Record<string, unknown> }> }
type DocumentSnapshot = { exists: boolean; id: string; data: () => Record<string, unknown> | undefined }

type FirestoreCompatInstance = {
  collection: (path: string) => {
    add: (data: Record<string, unknown>) => Promise<{ id: string }>
    where: (fieldPath: string, opStr: string, value: unknown) => {
      get: () => Promise<QuerySnapshot>
    }
    get: () => Promise<QuerySnapshot>
  }
  doc: (path: string) => {
    get: () => Promise<DocumentSnapshot>
    set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>
    update: (data: Record<string, unknown>) => Promise<void>
    delete: () => Promise<void>
  }
}

let clientPromise: Promise<FirestoreCompatInstance> | null = null

function createFirestoreError(message: string, code: string) {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

function assertFirebaseReady() {
  if (!firebase.projectId) {
    throw createFirestoreError('Projeto Firebase não configurado (VITE_FIREBASE_PROJECT_ID ausente).', 'failed-precondition')
  }
}

function getAuthHeaders() {
  const session = loadSession()
  if (!session?.idToken) {
    throw createFirestoreError('Sessão inválida para acessar o Firestore. Faça login novamente.', 'unauthenticated')
  }

  return {
    Authorization: `Bearer ${session.idToken}`,
    'Content-Type': 'application/json',
  }
}

function baseDocumentsUrl() {
  assertFirebaseReady()
  return `https://firestore.googleapis.com/v1/projects/${firebase.projectId}/databases/(default)/documents`
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) }
    return { doubleValue: value }
  }

  if (typeof value === 'string') {
    const isIsoTimestamp = /^\d{4}-\d{2}-\d{2}T/.test(value)
    if (isIsoTimestamp) return { timestampValue: value }
    return { stringValue: value }
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } }
  }

  if (typeof value === 'object') {
    const fields = Object.entries(value as Record<string, unknown>).reduce<Record<string, FirestoreValue>>((acc, [key, item]) => {
      acc[key] = toFirestoreValue(item)
      return acc
    }, {})
    return { mapValue: { fields } }
  }

  return { stringValue: String(value) }
}

function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined
  if ('nullValue' in value) return null
  if (typeof value.booleanValue === 'boolean') return value.booleanValue
  if (typeof value.integerValue === 'string') return Number(value.integerValue)
  if (typeof value.doubleValue === 'number') return value.doubleValue
  if (typeof value.timestampValue === 'string') return value.timestampValue
  if (typeof value.stringValue === 'string') return value.stringValue
  if (value.arrayValue?.values) return value.arrayValue.values.map((item) => fromFirestoreValue(item))

  if (value.mapValue?.fields) {
    return Object.entries(value.mapValue.fields).reduce<Record<string, unknown>>((acc, [key, item]) => {
      acc[key] = fromFirestoreValue(item)
      return acc
    }, {})
  }

  return undefined
}

function parseDocument(doc?: FirestoreDocument) {
  if (!doc?.fields) return {}
  return Object.entries(doc.fields).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = fromFirestoreValue(value)
    return acc
  }, {})
}

function extractDocId(documentName: string) {
  const parts = documentName.split('/')
  return parts[parts.length - 1] || ''
}

async function parseFirestoreError(response: Response): Promise<never> {
  const payload = (await response.json().catch(() => null)) as FirestoreErrorPayload | null
  const status = payload?.error?.status || 'UNKNOWN'
  const message = payload?.error?.message || 'Falha desconhecida no Firestore.'
  const code = status.toLowerCase().replace(/_/g, '-')
  throw createFirestoreError(message, code)
}

async function firestoreRequest(path: string, init?: RequestInit) {
  const url = `${baseDocumentsUrl()}${path}`
  const headers = {
    ...getAuthHeaders(),
    ...(init?.headers || {}),
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (!response.ok) {
    await parseFirestoreError(response)
  }

  return response
}

async function runQuery(collectionPath: string, fieldPath: string, value: unknown): Promise<QuerySnapshot> {
  const response = await firestoreRequest(`:runQuery`, {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionPath }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: toFirestoreValue(value),
          },
        },
      },
    }),
  })

  const payload = (await response.json()) as Array<{ document?: FirestoreDocument }>
  const docs = payload
    .map((row) => row.document)
    .filter((row): row is FirestoreDocument => Boolean(row?.name))
    .map((doc) => ({
      id: extractDocId(doc.name),
      data: () => parseDocument(doc),
    }))

  return { docs }
}

async function listCollection(collectionPath: string): Promise<QuerySnapshot> {
  const response = await firestoreRequest(`/${collectionPath}`, { method: 'GET' })
  const payload = (await response.json()) as { documents?: FirestoreDocument[] }
  const docs = (payload.documents || []).map((doc) => ({
    id: extractDocId(doc.name),
    data: () => parseDocument(doc),
  }))
  return { docs }
}

async function getDocument(path: string): Promise<DocumentSnapshot> {
  try {
    const response = await firestoreRequest(`/${path}`, { method: 'GET' })
    const payload = (await response.json()) as FirestoreDocument
    const id = extractDocId(payload.name)
    return {
      exists: true,
      id,
      data: () => parseDocument(payload),
    }
  } catch (error) {
    const code = typeof (error as { code?: string })?.code === 'string' ? (error as { code: string }).code : 'unknown'
    if (code === 'not-found') {
      const parts = path.split('/')
      const id = parts[parts.length - 1] || ''
      return { exists: false, id, data: () => undefined }
    }
    throw error
  }
}

async function setDocument(path: string, data: Record<string, unknown>) {
  await firestoreRequest(`/${path}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: Object.entries(data).reduce<Record<string, FirestoreValue>>((acc, [key, value]) => {
        acc[key] = toFirestoreValue(value)
        return acc
      }, {}),
    }),
  })
}

async function deleteDocument(path: string) {
  await firestoreRequest(`/${path}`, { method: 'DELETE' })
}

async function addDocument(collectionPath: string, data: Record<string, unknown>) {
  const response = await firestoreRequest(`/${collectionPath}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: Object.entries(data).reduce<Record<string, FirestoreValue>>((acc, [key, value]) => {
        acc[key] = toFirestoreValue(value)
        return acc
      }, {}),
    }),
  })

  const payload = (await response.json()) as FirestoreDocument
  return { id: extractDocId(payload.name) }
}

function createFirestoreClient(): FirestoreCompatInstance {
  console.info('[firestore][sdk] inicializando cliente REST autenticado via idToken')

  return {
    collection: (path: string) => ({
      add: (data) => addDocument(path, data),
      where: (fieldPath: string, opStr: string, value: unknown) => ({
        get: async () => {
          if (opStr !== '==') {
            throw createFirestoreError(`Operador de query não suportado no adapter atual: ${opStr}`, 'invalid-argument')
          }
          return runQuery(path, fieldPath, value)
        },
      }),
      get: () => listCollection(path),
    }),
    doc: (path: string) => ({
      get: () => getDocument(path),
      set: (data) => setDocument(path, data),
      update: (data) => setDocument(path, data),
      delete: () => deleteDocument(path),
    }),
  }
}

export async function getFirestoreClient(): Promise<FirestoreCompatInstance> {
  if (!clientPromise) {
    clientPromise = Promise.resolve().then(() => createFirestoreClient())
  }

  try {
    return await clientPromise
  } catch (error) {
    clientPromise = null
    throw error
  }
}
