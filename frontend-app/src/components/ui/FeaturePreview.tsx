// Updated 2025-12-09 17:15 CST by ChatGPT
import type { PropsWithChildren } from 'react'

type Tier = 'free' | 'essential' | 'pro' | 'ultimate'

type FeaturePreviewProps = PropsWithChildren<{
  featureKey: string
  requiredTier?: Tier
  userTier?: Tier
}>

const tierRank: Record<Tier, number> = { free: 0, essential: 1, pro: 2, ultimate: 3 }

export const FeaturePreview = ({
  children,
  featureKey,
  requiredTier = 'pro',
  userTier = 'free',
}: FeaturePreviewProps) => {
  const blocked = tierRank[userTier] < tierRank[requiredTier]

  if (!blocked) return <>{children}</>

  return (
    <div className="feature-preview-wrapper" data-feature-preview={featureKey}>
      <div className="feature-preview-overlay" aria-hidden="true" />
      <div className="feature-preview-badge" aria-label="Premium feature">
        Premium
      </div>
      <div className="feature-preview-blocked">{children}</div>
    </div>
  )
}
