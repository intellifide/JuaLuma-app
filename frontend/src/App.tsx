// Updated 2025-01-25 18:25 CST by Antigravity

import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { CookieConsentBanner } from './components/CookieConsentBanner'
// Layouts
import { WebsiteLayout } from './layouts/WebsiteLayout'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Public Pages
import { Home } from './pages/Home'
import { Features } from './pages/Features'
import { Pricing } from './pages/Pricing'
import { About } from './pages/About'
import { Support } from './pages/Support'
import { Marketplace } from './pages/Marketplace'
import { DeveloperLanding } from './pages/developers/DeveloperLanding'
import { DeveloperSDK } from './pages/DeveloperSDK'
import { Privacy } from './pages/legal/Privacy'
import { Terms } from './pages/legal/Terms'
import AIDisclaimer from './pages/legal/AIDisclaimer'
import NotFound from './pages/NotFound'

// Auth Pages
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { VerifyEmail } from './pages/VerifyEmail'
import { ResetPassword } from './pages/ResetPassword'
import { DeveloperAuth } from './pages/developers/DeveloperAuth'

// Protected App Pages
import Dashboard from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { ConnectAccounts } from './pages/ConnectAccounts'
import AIAssistant from './pages/AIAssistant'
import { Settings } from './pages/Settings'
import { TicketDetail } from './pages/TicketDetail'
import { FeatureRequest } from './pages/FeatureRequest'
import { HouseholdPage } from './pages/Household/HouseholdPage'
import JoinHousehold from './pages/JoinHousehold'
import { DeveloperDashboard } from './pages/developers/DeveloperDashboard'
import { CheckoutSuccess } from './pages/CheckoutSuccess'
import Maintenance from './pages/Maintenance'

function App() {
  const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true'

  if (MAINTENANCE_MODE) {
    return <Maintenance />
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <CookieConsentBanner />
          <Routes>
            {/* --- Website Routes (Public Marketing) --- */}
          <Route element={<WebsiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<Support />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/developer-sdk" element={<DeveloperSDK />} />
            <Route path="/developers" element={<DeveloperLanding />} />
            
            {/* Legal */}
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/legal/ai-disclaimer" element={<AIDisclaimer />} />
            
            {/* Public forms? or move to Auth? Feature Request could be public or private */}
            <Route path="/feature-request" element={<FeatureRequest />} />
          </Route>

          {/* --- Auth Routes (Standalone) --- */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/developers/login" element={<DeveloperAuth mode="login" />} />
          <Route path="/developers/signup" element={<DeveloperAuth mode="signup" />} />
          <Route path="/household/accept-invite" element={<JoinHousehold />} />

           {/* --- Application Routes (Protected Dashboard) --- */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/connect-accounts" element={<ConnectAccounts />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/household" element={<HouseholdPage />} />
            
            {/* Nested or Specific App Pages */}
            <Route path="/support/tickets/:ticketId" element={<TicketDetail />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/developers/dashboard" element={<DeveloperDashboard />} />
            
             {/* Legacy Redirects */}
            <Route path="/developer-marketplace" element={<Navigate to="/developers/dashboard" replace />} />
          </Route>

          {/* 404 - Rendered inside Website Layout so it has nav */}
          <Route element={<WebsiteLayout />}>
             <Route path="*" element={<NotFound />} />
          </Route>

          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
