// Updated 2025-12-08 20:31 CST by ChatGPT
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

if (import.meta.env.DEV) {
  // Use the local emulator during development to avoid hitting real Firebase.
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
}

export { app, auth }
