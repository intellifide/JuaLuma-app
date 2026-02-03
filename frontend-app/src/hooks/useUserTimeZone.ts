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
