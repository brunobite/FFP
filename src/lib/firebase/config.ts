const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingConfig.length > 0) {
  console.warn(`[firebase] variáveis ausentes no build: ${missingConfig.join(', ')}`)
}

export const firebase = {
  ...firebaseConfig,
  identityBaseUrl: 'https://identitytoolkit.googleapis.com/v1',
  storageBaseUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}`,
}

export function getAuthStorageKey() {
  return `ffp_auth_${firebase.projectId}`
}
