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

import React from 'react'

const rand = (min: number, max: number) => Math.random() * (max - min) + min

const createVector = (minDistance: number, maxDistance: number) => {
  const angle = rand(0, Math.PI * 2)
  const distance = rand(minDistance, maxDistance)
  const dx = Math.cos(angle) * distance
  const dy = Math.sin(angle) * distance
  const rot = (angle * 180) / Math.PI
  return { dx, dy, rot }
}

type PassiveStar = {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  rot: number
  duration: number
  delay: number
  length: number
}

type ClickStar = {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  rot: number
  length: number
}

type ClickAnchor = {
  id: number
  x: number
  y: number
}

const createPassiveStar = (id: number, width: number, height: number): PassiveStar => {
  const vector = createVector(340, 760)
  return {
    id,
    x: rand(width * 0.05, width * 0.95),
    y: rand(height * 0.05, height * 0.7),
    dx: vector.dx,
    dy: vector.dy,
    rot: vector.rot,
    duration: Math.round(rand(1700, 2500)),
    delay: Math.round(rand(15000, 35000)),
    length: Math.round(rand(180, 280)),
  }
}

const createClickStar = (id: number, x: number, y: number): ClickStar => {
  const vector = createVector(240, 520)
  return {
    id,
    x,
    y,
    dx: vector.dx,
    dy: vector.dy,
    rot: vector.rot,
    length: Math.round(rand(80, 130)),
  }
}

export const GalaxyWaveBackground: React.FC = () => {
  const [isStaticMode, setIsStaticMode] = React.useState(false)
  const [passiveStars, setPassiveStars] = React.useState<PassiveStar[]>([])
  const [clickStars, setClickStars] = React.useState<ClickStar[]>([])
  const [clickAnchor, setClickAnchor] = React.useState<ClickAnchor | null>(null)
  const nextIdRef = React.useRef(0)
  const pendingAnchorRef = React.useRef<ClickAnchor | null>(null)

  const nextId = React.useCallback(() => {
    nextIdRef.current += 1
    return nextIdRef.current
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const nav = window.navigator as Navigator & { deviceMemory?: number }
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const evaluate = () => {
      const lowCpu =
        typeof nav.hardwareConcurrency === 'number' &&
        nav.hardwareConcurrency > 0 &&
        nav.hardwareConcurrency <= 2
      const lowMemory =
        typeof nav.deviceMemory === 'number' &&
        nav.deviceMemory > 0 &&
        nav.deviceMemory <= 2
      setIsStaticMode(motionQuery.matches || lowCpu || lowMemory)
    }

    evaluate()
    motionQuery.addEventListener?.('change', evaluate)
    window.addEventListener('resize', evaluate)

    return () => {
      motionQuery.removeEventListener?.('change', evaluate)
      window.removeEventListener('resize', evaluate)
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined' || isStaticMode) return undefined

    const initializePassiveStars = () => {
      const width = Math.max(window.innerWidth, 320)
      const height = Math.max(window.innerHeight, 320)
      setPassiveStars([createPassiveStar(nextId(), width, height)])
    }

    const clearPendingAnchor = () => {
      pendingAnchorRef.current = null
      setClickAnchor(null)
    }

    const launchAnchor = () => {
      if (!pendingAnchorRef.current) return
      const anchor = pendingAnchorRef.current
      clearPendingAnchor()

      const launched = createClickStar(nextId(), anchor.x, anchor.y)
      setClickStars((prev) => {
        const next = [...prev, launched]
        return next.length > 14 ? next.slice(next.length - 14) : next
      })
    }

    initializePassiveStars()

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (!(event.target instanceof Element)) return
      if (event.target.closest('[data-star-click-block="true"]')) return

      const anchor = { id: nextId(), x: event.clientX, y: event.clientY }
      pendingAnchorRef.current = anchor
      setClickAnchor(anchor)
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return
      launchAnchor()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', clearPendingAnchor)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', clearPendingAnchor)
      clearPendingAnchor()
    }
  }, [isStaticMode, nextId])

  const removeClickStar = React.useCallback((id: number) => {
    setClickStars((prev) => prev.filter((star) => star.id !== id))
  }, [])

  const respawnPassiveStar = React.useCallback((id: number) => {
    if (typeof window === 'undefined') return
    const width = Math.max(window.innerWidth, 320)
    const height = Math.max(window.innerHeight, 320)
    setPassiveStars((prev) =>
      prev.map((star) => (star.id === id ? createPassiveStar(nextId(), width, height) : star))
    )
  }, [nextId])

  return (
    <div className={`galaxy-wave-background${isStaticMode ? ' is-static' : ''}`} aria-hidden="true">
      <div className="galaxy-space-base" />
      <div className="galaxy-stars galaxy-stars-far" />
      <div className="galaxy-stars galaxy-stars-mid" />
      <div className="galaxy-stars galaxy-stars-near" />
      <div className="galaxy-milkyway-core" />
      <div className="galaxy-milkyway-haze" />
      <div className="galaxy-wave-haze" />
      <div className="galaxy-shooting-stars">
        {passiveStars.map((star) => (
          <span
            key={star.id}
            className="shooting-star-flight passive-shooting-star"
            onAnimationEnd={() => respawnPassiveStar(star.id)}
            style={
              {
                left: `${star.x}px`,
                top: `${star.y}px`,
                '--dx': `${star.dx}px`,
                '--dy': `${star.dy}px`,
                '--star-duration': `${star.duration}ms`,
                '--star-delay': `${star.delay}ms`,
              } as React.CSSProperties
            }
          >
            <span
              className="shooting-star-ray shooting-star-ray-passive"
              style={
                {
                  '--rot': `${star.rot}deg`,
                  '--star-length': `${star.length}px`,
                } as React.CSSProperties
              }
            />
          </span>
        ))}
      </div>
      <div className="galaxy-click-stars">
        {clickAnchor && (
          <span
            className="galaxy-click-anchor"
            style={
              {
                left: `${clickAnchor.x}px`,
                top: `${clickAnchor.y}px`,
              } as React.CSSProperties
            }
          />
        )}
        {clickStars.map((star) => (
          <span
            key={star.id}
            className="shooting-star-flight click-shooting-star"
            onAnimationEnd={() => removeClickStar(star.id)}
            style={
              {
                left: `${star.x}px`,
                top: `${star.y}px`,
                '--dx': `${star.dx}px`,
                '--dy': `${star.dy}px`,
              } as React.CSSProperties
            }
          >
            <span
              className="shooting-star-ray shooting-star-ray-click"
              style={
                {
                  '--rot': `${star.rot}deg`,
                  '--star-length': `${star.length}px`,
                } as React.CSSProperties
              }
            />
          </span>
        ))}
      </div>
    </div>
  )
}
