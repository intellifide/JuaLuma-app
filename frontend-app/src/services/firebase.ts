/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

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

const emulatorFlag =
  import.meta.env.VITE_FIREBASE_EMULATOR_ENABLED ??
  import.meta.env.VITE_USE_FIREBASE_EMULATOR
const useAuthEmulator = import.meta.env.DEV && emulatorFlag !== 'false'
const authEmulatorHost =
  import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099'
const authEmulatorUrl = useAuthEmulator
  ? authEmulatorHost.startsWith('http')
    ? authEmulatorHost
    : `http://${authEmulatorHost}`
  : null

if (authEmulatorUrl) {
  // Use the local emulator during development to avoid hitting real Firebase.
  const emulatorConfig = (auth as { emulatorConfig?: unknown }).emulatorConfig
  if (!emulatorConfig) {
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true })
  }
}

export { app, auth, authEmulatorUrl }
