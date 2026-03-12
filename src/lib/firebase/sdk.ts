import { firebase as firebaseConfig } from '@/lib/firebase/config'

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

type FirestoreModule = {
  CACHE_SIZE_UNLIMITED: number
  collection: (db: unknown, path: string) => unknown
  deleteDoc: (ref: unknown) => Promise<void>
  doc: (db: unknown, path: string) => unknown
  getDoc: (ref: unknown) => Promise<{ exists: () => boolean; id: string; data: () => Record<string, unknown> | undefined }>
  getDocFromCache: (ref: unknown) => Promise<{ exists: () => boolean; id: string; data: () => Record<string, unknown> | undefined }>
  getDocFromServer: (ref: unknown) => Promise<{ exists: () => boolean; id: string; data: () => Record<string, unknown> | undefined }>
  getDocs: (query: unknown) => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
  getDocsFromCache: (query: unknown) => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
  getDocsFromServer: (query: unknown) => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
  initializeFirestore: (app: unknown, settings: Record<string, unknown>) => unknown
  persistentLocalCache: (settings?: { tabManager?: unknown }) => unknown
  persistentMultipleTabManager: () => unknown
  query: (collectionRef: unknown, ...constraints: unknown[]) => unknown
  setDoc: (docRef: unknown, data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>
  updateDoc: (docRef: unknown, data: Record<string, unknown>) => Promise<void>
  where: (fieldPath: string, opStr: string, value: unknown) => unknown
  addDoc: (collectionRef: unknown, data: Record<string, unknown>) => Promise<{ id: string }>
}

type AppModule = {
  getApps: () => unknown[]
  getApp: () => unknown
  initializeApp: (config: Record<string, string | undefined>) => unknown
}

let clientPromise: Promise<FirestoreCompatInstance> | null = null
let modulesPromise: Promise<{ app: AppModule; firestore: FirestoreModule }> | null = null

function createFirestoreError(message: string, code: string) {
  const error = new Error(message) as Error & { code: string }
  error.code = code
  return error
}

async function loadFirebaseModules() {
  if (!modulesPromise) {
    const importFromUrl = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>
    modulesPromise = Promise.all([
      importFromUrl('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      importFromUrl('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'),
    ]).then(([app, firestore]) => ({ app: app as AppModule, firestore: firestore as FirestoreModule }))
  }

  return modulesPromise
}

function assertFirebaseReady() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw createFirestoreError('Firebase não configurado corretamente. Verifique as variáveis VITE_FIREBASE_*.', 'failed-precondition')
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

function mapQuerySnapshot(snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }): QuerySnapshot {
  return {
    docs: snapshot.docs.map((doc) => ({ id: doc.id, data: () => doc.data() })),
  }
}

function mapDocumentSnapshot(snapshot: { exists: () => boolean; id: string; data: () => Record<string, unknown> | undefined }): DocumentSnapshot {
  return {
    exists: snapshot.exists(),
    id: snapshot.id,
    data: () => snapshot.data(),
  }
}

async function createFirestoreClient(): Promise<FirestoreCompatInstance> {
  assertFirebaseReady()

  const { app: appModule, firestore: firestoreModule } = await loadFirebaseModules()
  const app = appModule.getApps().length
    ? appModule.getApp()
    : appModule.initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    })

  const db = firestoreModule.initializeFirestore(app, {
    localCache: firestoreModule.persistentLocalCache({
      tabManager: firestoreModule.persistentMultipleTabManager(),
    }),
  })

  console.info('[firestore][sdk] cliente Firestore Web SDK inicializado (singleton/modular, cache local persistente)')

  const attemptDocFromServer = async (ref: unknown, retry: boolean): ReturnType<typeof firestoreModule.getDocFromServer> => {
    try {
      return await firestoreModule.getDocFromServer(ref)
    } catch (err) {
      const msg = typeof (err as { message?: string })?.message === 'string' ? (err as { message: string }).message.toLowerCase() : ''
      const code = typeof (err as { code?: string })?.code === 'string' ? (err as { code: string }).code : ''
      const isOffline = code === 'unavailable' || msg.includes('offline') || msg.includes('network') || msg.includes('client is offline')
      if (!isOffline) throw err

      // If online but got an offline-like error, the SDK may still be warming up (cold-start race).
      // Retry once after a short delay to let the Firestore SDK finish initializing.
      if (retry && typeof navigator !== 'undefined' && navigator.onLine) {
        console.info('[firestore][sdk] servidor indisponível durante inicialização; retentando em 1s...', { online: true })
        await new Promise((r) => setTimeout(r, 1000))
        return attemptDocFromServer(ref, false)
      }

      throw err
    }
  }

  const resolveDocRead = async (ref: unknown, source: 'default' | 'server' | 'cache' = 'default') => {
    if (source === 'cache') return firestoreModule.getDocFromCache(ref)
    if (source === 'server') return attemptDocFromServer(ref, true)

    // Default: try server first, fall back to cache if offline
    try {
      return await attemptDocFromServer(ref, true)
    } catch (err) {
      const msg = typeof (err as { message?: string })?.message === 'string' ? (err as { message: string }).message.toLowerCase() : ''
      const code = typeof (err as { code?: string })?.code === 'string' ? (err as { code: string }).code : ''
      const isOffline = code === 'unavailable' || msg.includes('offline') || msg.includes('network') || msg.includes('client is offline')
      if (!isOffline) throw err
      console.info('[firestore][sdk] doc read fallback para cache', { online: typeof navigator !== 'undefined' ? navigator.onLine : undefined })
      return firestoreModule.getDocFromCache(ref)
    }
  }

  const attemptQueryFromServer = async (queryRef: unknown, retry: boolean): ReturnType<typeof firestoreModule.getDocsFromServer> => {
    try {
      return await firestoreModule.getDocsFromServer(queryRef)
    } catch (err) {
      const msg = typeof (err as { message?: string })?.message === 'string' ? (err as { message: string }).message.toLowerCase() : ''
      const code = typeof (err as { code?: string })?.code === 'string' ? (err as { code: string }).code : ''
      const isOffline = code === 'unavailable' || msg.includes('offline') || msg.includes('network') || msg.includes('client is offline')
      if (!isOffline) throw err

      if (retry && typeof navigator !== 'undefined' && navigator.onLine) {
        console.info('[firestore][sdk] query servidor indisponível durante inicialização; retentando em 1s...', { online: true })
        await new Promise((r) => setTimeout(r, 1000))
        return attemptQueryFromServer(queryRef, false)
      }

      throw err
    }
  }

  const resolveQueryRead = async (queryRef: unknown, source: 'default' | 'server' | 'cache' = 'default') => {
    if (source === 'cache') return firestoreModule.getDocsFromCache(queryRef)
    if (source === 'server') return attemptQueryFromServer(queryRef, true)

    // Default: try server first, fall back to cache if offline
    try {
      return await attemptQueryFromServer(queryRef, true)
    } catch (err) {
      const msg = typeof (err as { message?: string })?.message === 'string' ? (err as { message: string }).message.toLowerCase() : ''
      const code = typeof (err as { code?: string })?.code === 'string' ? (err as { code: string }).code : ''
      const isOffline = code === 'unavailable' || msg.includes('offline') || msg.includes('network') || msg.includes('client is offline')
      if (!isOffline) throw err
      console.info('[firestore][sdk] query read fallback para cache', { online: typeof navigator !== 'undefined' ? navigator.onLine : undefined })
      return firestoreModule.getDocsFromCache(queryRef)
    }
  }

  return {
    collection: (path: string) => {
      const collectionRef = firestoreModule.collection(db, path)
      return {
        add: async (data) => {
          try {
            return await firestoreModule.addDoc(collectionRef, data)
          } catch (error) {
            mapError(error)
          }
        },
        where: (fieldPath: string, opStr: string, value: unknown) => ({
          get: async (options) => {
            try {
              const queryRef = firestoreModule.query(collectionRef, firestoreModule.where(fieldPath, opStr, value))
              return mapQuerySnapshot(await resolveQueryRead(queryRef, options?.source))
            } catch (error) {
              mapError(error)
            }
          },
        }),
        get: async (options) => {
          try {
            return mapQuerySnapshot(await resolveQueryRead(collectionRef, options?.source))
          } catch (error) {
            mapError(error)
          }
        },
      }
    },
    doc: (path: string) => {
      const docRef = firestoreModule.doc(db, path)
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
            await firestoreModule.setDoc(docRef, data, options)
          } catch (error) {
            mapError(error)
          }
        },
        update: async (data) => {
          try {
            await firestoreModule.updateDoc(docRef, data)
          } catch (error) {
            mapError(error)
          }
        },
        delete: async () => {
          try {
            await firestoreModule.deleteDoc(docRef)
          } catch (error) {
            mapError(error)
          }
        },
      }
    },
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
