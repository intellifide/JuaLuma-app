// Updated 2025-12-09 17:45 CST by ChatGPT
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import './styles/theme.css'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './components/ui'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

// Force Unregister Service Worker to fix loading issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
    }
  })
}

// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js').then(
//       (registration) => {
//         console.log('ServiceWorker registration successful with scope: ', registration.scope)
//       },
//       (err) => {
//         console.log('ServiceWorker registration failed: ', err)
//       },
//     )
//   })
// }
