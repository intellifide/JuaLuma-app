/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 */

import { describe, expect, it } from 'vitest'

import { normalizeApiErrorMessage } from './apiErrorMessages'

describe('normalizeApiErrorMessage', () => {
  it('returns a friendly message for technical 413 failures', () => {
    expect(normalizeApiErrorMessage(413, 'Request failed with status code 413')).toBe(
      'File is too large. Maximum supported size is 20 MB.',
    )
  })

  it('returns auth-safe messaging for 401', () => {
    expect(normalizeApiErrorMessage(401, 'token expired')).toBe(
      'Unable to verify your access right now. Please sign in and try again.',
    )
  })

  it('keeps explicit user-safe backend messages', () => {
    expect(
      normalizeApiErrorMessage(
        413,
        'Uploaded file is too large. Maximum supported size is 20 MB.',
      ),
    ).toBe('Uploaded file is too large. Maximum supported size is 20 MB.')
  })

  it('maps HTML error payloads to a friendly fallback', () => {
    expect(normalizeApiErrorMessage(500, '<html><body>error</body></html>')).toBe(
      'Something went wrong on our side. Please try again.',
    )
  })
})

