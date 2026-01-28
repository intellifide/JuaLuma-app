// Updated 2025-01-25 18:30 CST by Antigravity

import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { CookieConsentBanner } from './components/CookieConsentBanner'
// Layouts
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Public Pages
import NotFound from './pages/NotFound'

// Auth Pages
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { VerifyEmail } from './pages/VerifyEmail'
import { PricingRedirect } from './pages/PricingRedirect'
import { ResetPassword } from './pages/ResetPassword'
import { DeveloperAuth } from './pages/developers/DeveloperAuth'

// Protected App Pages
import Dashboard from './pages/Dashboard'
import FinancialAnalysis from './pages/FinancialAnalysis'
import { Transactions } from './pages/Transactions'
import { ConnectAccounts } from './pages/ConnectAccounts'
import AIAssistant from './pages/AIAssistant'
import { Settings } from './pages/Settings'
import { Support } from './pages/Support'
import { TicketDetail } from './pages/TicketDetail'
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
            {/* --- Root Redirect --- */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

             {/* --- Auth Routes (Standalone) --- */}

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/pricing" element={<PricingRedirect />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/developers/login" element={<DeveloperAuth mode="login" />} />
            <Route path="/developers/signup" element={<DeveloperAuth mode="signup" />} />
            <Route path="/household/accept-invite" element={<JoinHousehold />} />

             {/* --- Application Routes (Protected Dashboard) --- */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/financial-analysis" element={<FinancialAnalysis />} />
            <Route path="/transactions" element={<Transactions />} />
              <Route path="/connect-accounts" element={<ConnectAccounts />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/household" element={<HouseholdPage />} />
              <Route path="/support" element={<Support />} />
              
              {/* Nested or Specific App Pages */}
              <Route path="/support/tickets/:ticketId" element={<TicketDetail />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/developers/dashboard" element={<DeveloperDashboard />} />
              
               {/* Legacy Redirects */}
              <Route path="/developer-marketplace" element={<Navigate to="/developers/dashboard" replace />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />


          
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
