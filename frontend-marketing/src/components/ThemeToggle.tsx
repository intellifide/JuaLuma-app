'use client'

import { useEffect, useState } from 'react'

export const ThemeToggle = () => {
    const [theme, setTheme] = useState('dark')

    useEffect(() => {
        // Default to dark on first load, check localstorage
        const saved = localStorage.getItem('theme') || 'dark'
        setTheme(saved)
        document.documentElement.setAttribute('data-theme', saved)
    }, [])

    const toggle = () => {
        const next = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        document.documentElement.setAttribute('data-theme', next)
        localStorage.setItem('theme', next)
    }

    return (
        <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
            {theme === 'light' ? (
                <span>🌙</span>
            ) : (
                <span>☀️</span>
            )}
        </button>
    )
}
