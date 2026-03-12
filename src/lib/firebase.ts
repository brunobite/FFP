import { initializeApp, getApps } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Guard: inicializa apenas uma vez
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0]

// Firestore com cache persistente — apenas no browser
let db: ReturnType<typeof initializeFirestore>

if (typeof window !== 'undefined') {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  })
} else {
  // Fallback para SSR/build — sem cache persistente
  const { getFirestore } = require('firebase/firestore')
  db = getFirestore(app)
}

export { db }
export default app
