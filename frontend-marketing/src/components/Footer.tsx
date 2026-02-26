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

'use client'

import Link from 'next/link'
import { APP_URL } from '@/lib/constants'

type FooterItem = {
  label: string
  href: string
  external?: boolean
  soon?: boolean
}

type FooterColumn = {
  heading: string
  items: FooterItem[]
}

const footerColumns: FooterColumn[] = [
  {
    heading: 'Product',
    items: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Marketplace', href: '/marketplace', soon: true },
    ],
  },
  {
    heading: 'Support',
    items: [
      { label: 'Support Center', href: '/support' },
      { label: 'FAQ', href: '/support#faq' },
      { label: 'Submit Ticket', href: `${APP_URL}/support/tickets/new`, external: true },
      { label: 'Feature Request', href: '/feature-request' },
    ],
  },
  {
    heading: 'Developers',
    items: [
      { label: 'Developer Home', href: '/developers', soon: true },
      { label: 'Developer SDK', href: '/developer-sdk', soon: true },
      { label: 'Source Available (Personal Use)', href: '/legal/license' },
    ],
  },
  {
    heading: 'Company',
    items: [
      { label: 'About Us', href: '/about' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'AI Disclaimer', href: '/legal/ai-disclaimer' },
    ],
  },
]

const SocialIcon = ({ children, href, label }: { children: React.ReactNode; href: string; label: string }) => (
  <a className="social-link" href={href} target="_blank" rel="noreferrer" aria-label={label}>
    {children}
  </a>
)

export const Footer = () => (
  <footer className="footer relative z-20">
    <div className="footer-container">
      <div className="footer-grid">
        {footerColumns.map((column) => (
          <div className="footer-section" key={column.heading}>
            <h3>{column.heading}</h3>
            <ul>
              {column.items.map((item) => (
                <li key={item.label}>
                  {item.soon ? (
                    <span className="footer-soon-row">
                      <span>{item.label}</span>
                      <span className="footer-soon-badge">SOON</span>
                    </span>
                  ) : item.external ? (
                    <a href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
                  ) : (
                    <Link href={item.href}>{item.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="footer-section">
          <h3>Connect</h3>
          <div className="social-links">
            <SocialIcon href="https://twitter.com/jualuma" label="X / Twitter">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://discord.gg/jualuma" label="Discord">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://youtube.com/@jualuma" label="YouTube">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://github.com/intellifide/JuaLuma-app" label="GitHub">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.387.6.111.793-.261.793-.577V20.73c-3.338.726-4.033-1.609-4.033-1.609-.546-1.387-1.333-1.756-1.333-1.756-1.089-.744.082-.729.082-.729 1.205.084 1.839 1.238 1.839 1.238 1.071 1.834 2.809 1.304 3.495.997.107-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.93 0-1.311.469-2.382 1.237-3.222-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.303 1.23A11.52 11.52 0 0 1 12 6.844c1.02.005 2.047.138 3.006.404 2.293-1.552 3.3-1.23 3.3-1.23.654 1.652.242 2.873.118 3.176.77.84 1.237 1.911 1.237 3.222 0 4.609-2.807 5.623-5.48 5.92.43.372.824 1.103.824 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </SocialIcon>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Copyright © 2026 JuaLuma by Intellifide</p>
        <p className="footer-bottom-links">All rights reserved. Privacy &amp; Disclaimer. Terms of Service. Privacy Policy. Legal disclaimers.</p>
      </div>
    </div>
  </footer>
)
