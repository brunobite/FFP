import { firebase as firebaseConfig } from '@/lib/firebase/config'

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

type FirestoreDoc = { id: string; data: () => Record<string, unknown> }
type RawDocSnapshot = { exists: boolean; id: string; data: () => Record<string, unknown> | undefined }
type RawQuerySnapshot = { docs: FirestoreDoc[] }

type RawFirestoreClient = {
  collection: (path: string) => {
    add: (data: Record<string, unknown>) => Promise<{ id: string }>
    where: (fieldPath: string, opStr: string, value: unknown) => { get: () => Promise<RawQuerySnapshot> }
    get: () => Promise<RawQuerySnapshot>
  }
  doc: (path: string) => {
    get: () => Promise<RawDocSnapshot>
    set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>
    update: (data: Record<string, unknown>) => Promise<void>
    delete: () => Promise<void>
  }
}

type FirebaseCompatGlobal = {
  apps: unknown[]
  initializeApp: (config: Record<string, string | undefined>) => unknown
  app: () => { firestore: () => RawFirestoreClient }
}

declare global {
  interface Window {
    firebase?: FirebaseCompatGlobal
  }
}

let clientPromise: Promise<FirestoreCompatInstance> | null = null

function createFirestoreError(message: string, code: string) {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

function assertFirebaseReady() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw createFirestoreError('Firebase não configurado corretamente. Verifique as variáveis VITE_FIREBASE_*.', 'failed-precondition')
  }

  if (!window.firebase) {
    throw createFirestoreError('Firebase SDK Web não carregado no cliente. Verifique os scripts do index.html.', 'failed-precondition')
  }
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

function mapQuerySnapshot(snapshot: RawQuerySnapshot): QuerySnapshot {
  return {
    docs: snapshot.docs.map((doc) => ({ id: doc.id, data: () => doc.data() })),
  }
}

function createFirestoreClient(): FirestoreCompatInstance {
  assertFirebaseReady()

  const sdk = window.firebase as FirebaseCompatGlobal
  if (!sdk.apps.length) {
    sdk.initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    })
  }

  const db = sdk.app().firestore()
  console.info('[firestore][sdk] cliente Firestore Web SDK inicializado')

  return {
    collection: (path: string) => ({
      add: async (data) => {
        try {
          return await db.collection(path).add(data)
        } catch (error) {
          mapError(error)
        }
      },
      where: (fieldPath: string, opStr: string, value: unknown) => ({
        get: async () => {
          try {
            return mapQuerySnapshot(await db.collection(path).where(fieldPath, opStr, value).get())
          } catch (error) {
            mapError(error)
          }
        },
      }),
      get: async () => {
        try {
          return mapQuerySnapshot(await db.collection(path).get())
        } catch (error) {
          mapError(error)
        }
      },
    }),
    doc: (path: string) => ({
      get: async () => {
        try {
          const snapshot = await db.doc(path).get()
          return {
            exists: snapshot.exists,
            id: snapshot.id,
            data: () => snapshot.data(),
          }
        } catch (error) {
          mapError(error)
        }
      },
      set: async (data, options) => {
        try {
          await db.doc(path).set(data, options)
        } catch (error) {
          mapError(error)
        }
      },
      update: async (data) => {
        try {
          await db.doc(path).update(data)
        } catch (error) {
          mapError(error)
        }
      },
      delete: async () => {
        try {
          await db.doc(path).delete()
        } catch (error) {
          mapError(error)
        }
      },
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
