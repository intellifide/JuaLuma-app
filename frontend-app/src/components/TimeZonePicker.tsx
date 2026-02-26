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

// Core Purpose: Searchable + scrollable time zone picker (avoids rendering a giant select).
// Last Updated: 2026-02-03 00:00 CST

import React, { useMemo, useState } from 'react'
import { Combobox } from '@headlessui/react'

type Props = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const getTimeZones = (): string[] => {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone')
  }
  return ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']
}

export const TimeZonePicker: React.FC<Props> = ({ value, onChange, disabled }) => {
  const [query, setQuery] = useState('')
  const timeZones = useMemo(() => getTimeZones(), [])

  const pinned = useMemo(
    () => [
      { label: 'UTC', value: 'UTC' },
      { label: 'Eastern', value: 'America/New_York' },
      { label: 'Central', value: 'America/Chicago' },
      { label: 'Mountain', value: 'America/Denver' },
      { label: 'Pacific', value: 'America/Los_Angeles' },
    ],
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const pinnedValues = new Set(pinned.map((p) => p.value))
      const rest = timeZones.filter((tz) => !pinnedValues.has(tz))
      return [...pinned.map((p) => p.value), ...rest]
    }
    return timeZones.filter((tz) => tz.toLowerCase().includes(q))
  }, [query, timeZones, pinned])

  return (
    <Combobox value={value} onChange={onChange} disabled={disabled}>
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          {pinned.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                value === p.value
                  ? 'bg-white/10 border-white/20 text-text-primary'
                  : 'bg-transparent border-white/10 text-text-secondary hover:bg-white/5 hover:text-text-primary'
              }`}
              aria-label={`Set time zone to ${p.label}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Combobox.Input
            className="form-input w-full pr-10"
            displayValue={(tz: string) => tz}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search time zones…"
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </Combobox.Button>

          <Combobox.Options className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl bg-bg-secondary/95 border border-white/10 shadow-lg backdrop-blur">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-muted">No matching time zones.</div>
            ) : (
              filtered.map((tz) => (
                <Combobox.Option
                  key={tz}
                  value={tz}
                  className={({ active }) =>
                    `cursor-pointer px-4 py-2 text-sm ${active ? 'bg-white/10 text-text-primary' : 'text-text-secondary'}`
                  }
                >
                  {tz}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </div>
    </Combobox>
  )
}
