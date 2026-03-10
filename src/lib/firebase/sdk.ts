import { firebase } from '@/lib/firebase/config'

const FIREBASE_SDK_VERSION = '10.12.5'
const APP_SCRIPT = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`
const FIRESTORE_SCRIPT = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore-compat.js`

type FirebaseCompat = {
  apps: Array<unknown>
  initializeApp: (config: Record<string, string | undefined>) => unknown
  app: () => unknown
  firestore: {
    FieldValue: {
      serverTimestamp: () => unknown
    }
  }
}

type FirestoreCompatInstance = {
  collection: (path: string) => {
    add: (data: Record<string, unknown>) => Promise<{ id: string }>
    where: (fieldPath: string, opStr: string, value: unknown) => {
      get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
    }
    get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
  }
  doc: (path: string) => {
    get: () => Promise<{ exists: boolean; id: string; data: () => Record<string, unknown> | undefined }>
    set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>
    update: (data: Record<string, unknown>) => Promise<void>
  }
}

declare global {
  interface Window {
    firebase?: FirebaseCompat & { firestore: (() => FirestoreCompatInstance) & FirebaseCompat['firestore'] }
  }
}

let sdkPromise: Promise<FirestoreCompatInstance> | null = null

function appendScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src=\"${src}\"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Falha ao carregar SDK ${src}`)), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Falha ao carregar SDK ${src}`))
    document.head.appendChild(script)
  })
}

export async function getFirestoreClient(): Promise<FirestoreCompatInstance> {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      await appendScript(APP_SCRIPT)
      await appendScript(FIRESTORE_SCRIPT)

      const compat = window.firebase
      if (!compat) {
        throw new Error('[firestore] SDK do Firebase não disponível no window após carregamento.')
      }

      if (compat.apps.length === 0) {
        compat.initializeApp(firebase)
      } else {
        compat.app()
      }

      return compat.firestore()
    })()
  }

  return sdkPromise
}

