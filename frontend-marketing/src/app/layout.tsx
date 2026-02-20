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

// Marketing site layout. Last modified: 2026-02-02 18:50 CST
import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export const metadata: Metadata = {
  title: 'JuaLuma - Master Your Finances',
  description: 'The ultimate financial aggregation and tracking platform.',
  icons: {
    icon: [{ url: '/assets/jualuma-logo-main.svg', type: 'image/svg+xml', sizes: 'any' }],
    apple: '/assets/jualuma-logo-main.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
        <Navbar />
        <main className="flex-grow pt-20">
          <div className="container mx-auto px-6">
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  )
}
