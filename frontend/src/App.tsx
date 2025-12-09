// Updated 2025-12-08 21:49 CST by ChatGPT
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { Navigation } from './components/Navigation'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { AIAssistant } from './pages/AIAssistant'
import { ConnectAccounts } from './pages/ConnectAccounts'
import { Transactions } from './pages/Transactions'

const Placeholder = ({ title }: { title: string }) => (
  <div className="max-w-4xl mx-auto px-6 py-10">
    <div className="bg-white/80 border border-slate-200 rounded-2xl shadow-xl p-8 backdrop-blur">
      <h1 className="text-3xl font-bold text-deep-indigo mb-4">{title}</h1>
      <p className="text-slate-700">Content coming soon.</p>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connect-accounts"
            element={
              <ProtectedRoute>
                <ConnectAccounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AIAssistant />
              </ProtectedRoute>
            }
          />
          <Route path="/features" element={<Placeholder title="Features" />} />
          <Route path="/pricing" element={<Placeholder title="Pricing" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
