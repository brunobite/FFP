const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebase = {
  ...firebaseConfig,
  identityBaseUrl: 'https://identitytoolkit.googleapis.com/v1',
  firestoreBaseUrl: `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`,
  storageBaseUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}`,
}

export function getAuthStorageKey() {
  return `ffp_auth_${firebase.projectId}`
}
