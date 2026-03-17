import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { firebaseConfig, getFirebaseRuntimeLogPayload } from '@/lib/firebase/config'

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

console.info('[firebase][runtime]', getFirebaseRuntimeLogPayload())
console.info('[firebase][apps]', getApps().map(({ name, options }) => ({
  name,
  projectId: options.projectId,
  authDomain: options.authDomain,
  storageBucket: options.storageBucket,
})))

export const auth = getAuth(app)

function createFirestoreInstance(): Firestore {
  if (typeof window === 'undefined') {
    return getFirestore(app)
  }

  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch {
    // Firestore já inicializado (HMR/import duplicado): reaproveita singleton existente.
    return getFirestore(app)
  }
}

export const db = createFirestoreInstance()
export default app
