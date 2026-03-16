import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  type DocumentReference,
  type Query,
  type DocumentData,
  type WhereFilterOp,
} from 'firebase/firestore'

type QuerySnapshot = { docs: Array<{ id: string; data: () => Record<string, unknown> }> }
type DocumentSnapshot = { exists: boolean; id: string; data: () => Record<string, unknown> | undefined }

type FirestoreCompatInstance = {
  collection: (path: string) => {
    add: (data: Record<string, unknown>) => Promise<{ id: string }>
    where: (fieldPath: string, opStr: string, value: unknown) => {
      get: (options?: { source?: 'default' | 'server' | 'cache' }) => Promise<QuerySnapshot>
    }
    get: (options?: { source?: 'default' | 'server' | 'cache' }) => Promise<QuerySnapshot>
  }
  doc: (path: string) => {
    get: (options?: { source?: 'default' | 'server' | 'cache' }) => Promise<DocumentSnapshot>
    set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>
    update: (data: Record<string, unknown>) => Promise<void>
    delete: () => Promise<void>
  }
}

function createFirestoreError(message: string, code: string) {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

function mapError(error: unknown): never {
  if (typeof error !== 'object' || error === null) {
    throw createFirestoreError(String(error || 'Falha desconhecida no Firestore.'), 'unknown')
  }

  const rawCode = typeof (error as { code?: string }).code === 'string' ? (error as { code: string }).code : 'unknown'
  const code = rawCode.replace('firestore/', '')
  const message = typeof (error as { message?: string }).message === 'string'
    ? (error as { message: string }).message
    : 'Falha desconhecida no Firestore.'

  throw createFirestoreError(message, code)
}


function getErrorCode(error: unknown) {
  const raw = typeof (error as { code?: string })?.code === 'string' ? (error as { code: string }).code : 'unknown'
  return raw.replace('firestore/', '')
}

function getErrorMessage(error: unknown) {
  return typeof (error as { message?: string })?.message === 'string' ? (error as { message: string }).message.toLowerCase() : ''
}

function isConfigError(error: unknown) {
  const code = getErrorCode(error)
  const message = getErrorMessage(error)
  return message.includes('database (default) not found') || message.includes('project configuration') || (code === 'failed-precondition' && message.includes('not configured'))
}

function isNetworkError(error: unknown) {
  const code = getErrorCode(error)
  const msg = getErrorMessage(error)
  if (isConfigError(error)) return false
  const hasNetworkSignal = msg.includes('offline') || msg.includes('network') || msg.includes('client is offline')
  return hasNetworkSignal || code === 'unavailable' && typeof navigator !== 'undefined' && !navigator.onLine
}

function mapQuerySnapshot(snapshot: { docs: Array<{ id: string; data: () => unknown }> }): QuerySnapshot {
  return {
    docs: snapshot.docs.map((d) => ({ id: d.id, data: () => d.data() as Record<string, unknown> })),
  }
}

function mapDocumentSnapshot(snapshot: { exists: () => boolean; id: string; data: () => unknown }): DocumentSnapshot {
  return {
    exists: snapshot.exists(),
    id: snapshot.id,
    data: () => snapshot.data() as Record<string, unknown> | undefined,
  }
}

async function attemptDocFromServer(ref: DocumentReference<DocumentData>, retry: boolean) {
  try {
    return await getDocFromServer(ref)
  } catch (err) {
    const isOffline = isNetworkError(err)
    if (!isOffline) throw err

    if (retry && typeof navigator !== 'undefined' && navigator.onLine) {
      console.info('[firestore][sdk] servidor indisponível durante inicialização; retentando em 1s...', { online: true })
      await new Promise((r) => setTimeout(r, 1000))
      return attemptDocFromServer(ref, false)
    }

    throw err
  }
}

async function resolveDocRead(ref: DocumentReference<DocumentData>, source: 'default' | 'server' | 'cache' = 'default') {
  if (source === 'cache') return getDocFromCache(ref)
  if (source === 'server') return attemptDocFromServer(ref, true)

  try {
    return await attemptDocFromServer(ref, true)
  } catch (err) {
    const isOffline = isNetworkError(err)
    if (!isOffline) throw err
    console.info('[firestore][sdk] doc read fallback para cache', { online: typeof navigator !== 'undefined' ? navigator.onLine : undefined, code: getErrorCode(err) })
    return getDocFromCache(ref)
  }
}

async function attemptQueryFromServer(queryRef: Query<DocumentData>, retry: boolean) {
  try {
    return await getDocsFromServer(queryRef)
  } catch (err) {
    const isOffline = isNetworkError(err)
    if (!isOffline) throw err

    if (retry && typeof navigator !== 'undefined' && navigator.onLine) {
      console.info('[firestore][sdk] query servidor indisponível durante inicialização; retentando em 1s...', { online: true })
      await new Promise((r) => setTimeout(r, 1000))
      return attemptQueryFromServer(queryRef, false)
    }

    throw err
  }
}

async function resolveQueryRead(queryRef: Query<DocumentData>, source: 'default' | 'server' | 'cache' = 'default') {
  if (source === 'cache') return getDocsFromCache(queryRef)
  if (source === 'server') return attemptQueryFromServer(queryRef, true)

  try {
    return await attemptQueryFromServer(queryRef, true)
  } catch (err) {
    const isOffline = isNetworkError(err)
    if (!isOffline) throw err
    console.info('[firestore][sdk] query read fallback para cache', { online: typeof navigator !== 'undefined' ? navigator.onLine : undefined, code: getErrorCode(err) })
    return getDocsFromCache(queryRef)
  }
}

function createFirestoreClient(): FirestoreCompatInstance {
  console.info('[firestore][sdk] cliente Firestore inicializado (singleton/modular, cache local persistente)')

  return {
    collection: (path: string) => {
      const collectionRef = collection(db, path)
      return {
        add: async (data) => {
          try {
            return await addDoc(collectionRef, data)
          } catch (error) {
            mapError(error)
          }
        },
        where: (fieldPath: string, opStr: string, value: unknown) => ({
          get: async (options) => {
            try {
              const queryRef = query(collectionRef, where(fieldPath, opStr as WhereFilterOp, value))
              return mapQuerySnapshot(await resolveQueryRead(queryRef, options?.source))
            } catch (error) {
              mapError(error)
            }
          },
        }),
        get: async (options) => {
          try {
            return mapQuerySnapshot(await resolveQueryRead(query(collectionRef), options?.source))
          } catch (error) {
            mapError(error)
          }
        },
      }
    },
    doc: (path: string) => {
      const docRef = doc(db, path)
      return {
        get: async (options) => {
          try {
            return mapDocumentSnapshot(await resolveDocRead(docRef, options?.source))
          } catch (error) {
            mapError(error)
          }
        },
        set: async (data, options) => {
          try {
            if (options) {
              await setDoc(docRef, data, options)
            } else {
              await setDoc(docRef, data)
            }
          } catch (error) {
            mapError(error)
          }
        },
        update: async (data) => {
          try {
            await updateDoc(docRef, data)
          } catch (error) {
            mapError(error)
          }
        },
        delete: async () => {
          try {
            await deleteDoc(docRef)
          } catch (error) {
            mapError(error)
          }
        },
      }
    },
  }
}

let client: FirestoreCompatInstance | null = null

export async function getFirestoreClient(): Promise<FirestoreCompatInstance> {
  if (!client) {
    client = createFirestoreClient()
  }
  return client
}
