// Updated 2025-12-09 16:45 CST by ChatGPT
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { Navigation } from './components/Navigation'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ResetPassword } from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import { Settings } from './pages/Settings'
import AIAssistant from './pages/AIAssistant'
import { ConnectAccounts } from './pages/ConnectAccounts'
import { Transactions } from './pages/Transactions'
import { Features } from './pages/Features'
import { Pricing } from './pages/Pricing'
import { Support } from './pages/Support'
import { TicketDetail } from './pages/TicketDetail'
import { FeatureRequest } from './pages/FeatureRequest'
import { About } from './pages/About'
import { Privacy } from './pages/legal/Privacy'
import { Terms } from './pages/legal/Terms'
import { SupportPortal } from './pages/SupportPortal'
import { Marketplace } from './pages/Marketplace'
import { DeveloperMarketplace } from './pages/DeveloperMarketplace'
import { DeveloperSDK } from './pages/DeveloperSDK'

const Placeholder = ({ title }: { title: string }) => (
  <div className="container py-12">
    <div className="glass-panel">
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <p className="text-slate-700">Content coming soon.</p>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Navigation />
        <main id="main-content">
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
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/support" element={<Support />} />
            <Route
              path="/support/tickets/:ticketId"
              element={
                <ProtectedRoute>
                  <TicketDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/feature-request" element={<FeatureRequest />} />
            <Route path="/about" element={<About />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/developer-marketplace" element={<DeveloperMarketplace />} />
            <Route path="/developer-sdk" element={<DeveloperSDK />} />
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/support-portal" element={<SupportPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
