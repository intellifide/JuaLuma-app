import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 2025-12-10 13:45 CST - keep tests clean between runs
afterEach(() => {
    cleanup()
})
