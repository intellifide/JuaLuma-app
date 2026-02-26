/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

// Updated 2025-12-09 17:15 CST by ChatGPT
import { createContext, useContext, useId, useState, type PropsWithChildren, type ReactNode } from 'react'

type TabsContextValue = {
  active: string
  setActive: (id: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

const useTabsCtx = () => {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used inside <Tabs>')
  return ctx
}

export const Tabs = ({ defaultValue, children }: PropsWithChildren<{ defaultValue: string }>) => {
  const [active, setActive] = useState(defaultValue)
  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>
}

export const TabList = ({ children }: PropsWithChildren) => (
  <div className="tabs">
    <ul className="tab-list">{children}</ul>
  </div>
)

export const Tab = ({ id, children }: { id: string; children: ReactNode }) => {
  const { active, setActive } = useTabsCtx()
  const isActive = active === id
  return (
    <li>
      <button
        type="button"
        className={`tab-button ${isActive ? 'active' : ''}`}
        onClick={() => setActive(id)}
      >
        {children}
      </button>
    </li>
  )
}

export const TabPanels = ({ children }: PropsWithChildren) => <div>{children}</div>

export const TabPanel = ({ id, children }: { id: string; children: ReactNode }) => {
  const { active } = useTabsCtx()
  const panelId = useId()
  return (
    <div id={panelId} className={`tab-content ${active === id ? 'active' : ''}`}>
      {children}
    </div>
  )
}
