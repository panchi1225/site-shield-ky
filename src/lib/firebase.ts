import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

export const firebaseApp =
  getApps().find((app) => app.name === '[DEFAULT]') ??
  initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

export const signatureFirebaseApp =
  getApps().find((app) => app.name === 'signature') ??
  initializeApp(firebaseConfig, 'signature')
export const signatureAuth = getAuth(signatureFirebaseApp)
export const signatureDb = getFirestore(signatureFirebaseApp)
