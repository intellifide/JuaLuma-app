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

import { useMemo } from 'react'
import { useAuth } from './useAuth'

export const useUserTimeZone = (): string => {
  const { profile } = useAuth()
  return useMemo(() => {
    return (
      profile?.time_zone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC'
    )
  }, [profile?.time_zone])
}
