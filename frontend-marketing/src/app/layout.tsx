// Marketing site layout. Last modified: 2026-02-02 18:50 CST
import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export const metadata: Metadata = {
  title: 'JuaLuma - Master Your Finances',
  description: 'The ultimate financial aggregation and tracking platform.',
  icons: {
    icon: '/favicon.ico',
    apple: '/assets/logo.png',
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
