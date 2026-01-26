import React, { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { WebsiteNavbar } from '../components/WebsiteNavbar'
import { Footer } from '../components/Footer'
import { motion } from 'framer-motion'

interface WebsiteLayoutProps {
  children?: ReactNode
}

export const WebsiteLayout: React.FC<WebsiteLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-bg-primary text-text-primary overflow-x-hidden font-sans selection:bg-accent/30 selection:text-white">
      <WebsiteNavbar />
      
      <main className="flex-grow pt-20">
         {/* If children is passed, use it, otherwise use Outlet for router nesting */}
         {children || <Outlet />}
      </main>

      <Footer />
    </div>
  )
}
