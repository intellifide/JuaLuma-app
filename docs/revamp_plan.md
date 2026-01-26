# JuaLuma App & Website Revamp Plan

## Executive Summary

This document outlines the strategic plan to separate the JuaLuma marketing website from the core web application and revamp the entire user experience to be futuristic, intuitive, and professional.

**Core Objectives:**

1.  **Strict Separation:** Decouple marketing pages (Website) from functional pages (App).
2.  **Navigation Split:** Marketing links (Features, Pricing) stay on the Website. App links (Dashboard, Transactions) stay in the App.
3.  **Aesthetic Overhaul:** Implement a "futuristic" design system with rich animations, glassmorphism, and premium typography.
4.  **Tech Stack:** React (Vite), Tailwind CSS (Theming), Framer Motion (Animations).

---

## Phase 1: Architectural Restructuring

### 1.1 Layout Separation

We will move away from a single global `Navigation.tsx` and introduce distinct Layout components.

- **`src/layouts/WebsiteLayout.tsx`**:
  - Contains `WebsiteNavbar` (Home, Features, Pricing, About, Support, Legal).
  - Contains `Footer`.
  - **Action:** "Login" / "Sign Up" buttons (redirect to App).
- **`src/layouts/AppLayout.tsx`**:
  - Contains `AppSidebar` or `AppHeader` (Dashboard, Transactions, Connect, AI, Settings).
  - **Action:** "Back to Website" (Universal link).
  - **Feature:** Secured by `ProtectedRoute` by default.
  - **Design:** optimized for density and utility (App-like feel).
- **`src/layouts/AuthLayout.tsx`** (Optional):
  - Dedicated layout for Login/Signup/Reset Password pages with a focused, split-screen or centered card design.

### 1.2 Router Refactoring (`App.tsx`)

Refactor the flat route list into nested routes based on layouts.

```tsx
<Routes>
  {/* Public Website Routes */}
  <Route element={<WebsiteLayout />}>
    <Route path="/" element={<Home />} />
    <Route path="/features" element={<Features />} />
    <Route path="/pricing" element={<Pricing />} />
    {/* ... other public pages */}
  </Route>

  {/* Application Routes */}
  <Route
    element={
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    }
  >
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/transactions" element={<Transactions />} />
    {/* ... other app pages */}
  </Route>

  {/* Auth Routes (Standalone or AuthLayout) */}
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
</Routes>
```

---

## Phase 2: Design System & Aesthetics (The "Wow" Factor)

### 2.1 Color & Typography Update (`index.css` & `tailwind.config.js`)

- **Palette**: Shift to a deep, rich "Cosmic" palette (Deep Space Blue, Neon Teal accents, Starlight White text).
- **Typography**: Ensure a modern sans-serif font (e.g., 'Inter' or 'Outfit') is loaded and applied globally.
- **Glassmorphism**: Enhance the existing `backdropBlur` utilities with comprehensive glass classes (borders, subtle gradients).

### 2.2 Animations (`framer-motion`)

- **Install**: `npm install framer-motion`
- **Page Transitions**: Wrap route content in `<AnimatePresence>` for smooth entry/exit animations between pages.
- **Micro-interactions**:
  - Hover effects on cards and buttons (scale, glow).
  - Staggered list load for Transactions/Dashboard items.

### 2.3 UI Simplification

- **Dashboard**: Remove clutter. Use "Widgets" or "Cards" with clear visual hierarchy.
- **Sidebar**: Collapsible sidebar for App navigation to maximize workspace.

---

## Phase 3: Implementation Steps

1.  **Setup**: Install `framer-motion`.
2.  **Refactor CSS**: Update CSS variables in `index.css` for the new look.
3.  **Create Components**:
    - Build `WebsiteNavbar`.
    - Build `AppSidebar`.
    - Build `WebsiteLayout` and `AppLayout`.
4.  **Migrate Routing**: Update `App.tsx` to use the new layouts.
5.  **Revamp Pages**:
    - **Home**: Add hero animation, feature grids.
    - **Dashboard**: Re-layout using the new cards and animation system.
6.  **Cleanup**: Remove the old `Navigation.tsx` logic (user checking) since separation handles it.

---

## Next Steps for Agent

1.  Run `npm install framer-motion`.
2.  Execute **Phase 1.1** (Create Layouts).
3.  Execute **Phase 1.2** (Refactor Router).
4.  Execute **Phase 2.1** (Update Aesthetics).
