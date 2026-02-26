'use client'

import { useCallback, useEffect, useState, type AnchorHTMLAttributes } from 'react'
import { APP_URL } from '@/lib/constants'

type ThemeMode = 'light' | 'dark'

type AppAuthLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  appPath: string
}

const THEME_EVENT = 'marketing-theme-change'

const resolveTheme = (): ThemeMode | null => {
  if (typeof window !== 'undefined') {
    const queryTheme = new URLSearchParams(window.location.search).get('theme')
    if (queryTheme === 'light' || queryTheme === 'dark') return queryTheme
  }

  if (
    typeof window !== 'undefined' &&
    window.localStorage &&
    typeof window.localStorage.getItem === 'function'
  ) {
    const storedTheme = window.localStorage.getItem('theme')
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  }

  if (typeof document !== 'undefined') {
    const documentTheme = document.documentElement.getAttribute('data-theme')
    if (documentTheme === 'light' || documentTheme === 'dark') return documentTheme
  }

  return null
}

const withThemeParam = (appPath: string): string => {
  const url = new URL(appPath, APP_URL)
  const resolvedTheme = resolveTheme()
  if (resolvedTheme) {
    url.searchParams.set('theme', resolvedTheme)
  } else {
    url.searchParams.delete('theme')
  }
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
