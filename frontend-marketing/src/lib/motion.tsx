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

'use client'

import React from 'react'

const MOTION_ONLY_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'whileInView',
  'viewport',
  'variants',
  'layoutId',
  'whileHover',
  'whileTap',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'onAnimationStart',
  'onAnimationComplete',
])

function stripMotionProps(props: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (!MOTION_ONLY_PROPS.has(key)) cleaned[key] = value
  }
  return cleaned
}

function createMotionElement(tag: string) {
  const MotionElement = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
    const cleaned = stripMotionProps(props)
    return React.createElement(tag, { ...cleaned, ref })
  })
  MotionElement.displayName = `motion.${tag}`
  return MotionElement
}

const cache = new Map<string, React.ComponentType<Record<string, unknown>>>()

export const motion = new Proxy({} as Record<string, React.ComponentType<Record<string, unknown>>>, {
  get(_target, prop: string) {
    if (!cache.has(prop)) cache.set(prop, createMotionElement(prop))
    return cache.get(prop)
  },
})

export const AnimatePresence: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>

export type Variants = Record<string, Record<string, unknown>>
