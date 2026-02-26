'use client'

import { useCallback, useEffect, useState, type AnchorHTMLAttributes } from 'react'
import { APP_URL } from '@/lib/constants'

type ThemeMode = 'light' | 'dark'

type AppAuthLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  appPath: string
}

const THEME_EVENT = 'marketing-theme-change'

const resolveTheme = (): ThemeMode => {
  if (typeof localStorage !== 'undefined') {
    const storedTheme = localStorage.getItem('theme')
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  }

  if (typeof document !== 'undefined') {
    const documentTheme = document.documentElement.getAttribute('data-theme')
    if (documentTheme === 'light' || documentTheme === 'dark') return documentTheme
  }

  return 'dark'
}

const withThemeParam = (appPath: string): string => {
  const url = new URL(appPath, APP_URL)
  url.searchParams.set('theme', resolveTheme())
  return url.toString()
}

export const AppAuthLink = ({ appPath, ...props }: AppAuthLinkProps) => {
  const [href, setHref] = useState(() => withThemeParam(appPath))

  const refreshHref = useCallback(() => {
    setHref(withThemeParam(appPath))
  }, [appPath])

  useEffect(() => {
    refreshHref()
    window.addEventListener(THEME_EVENT, refreshHref as EventListener)
    window.addEventListener('storage', refreshHref)
    return () => {
      window.removeEventListener(THEME_EVENT, refreshHref as EventListener)
      window.removeEventListener('storage', refreshHref)
    }
  }, [refreshHref])

  return <a {...props} href={href} />
}
