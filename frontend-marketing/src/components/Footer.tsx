'use client'

import Link from 'next/link'

export const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <div className="footer-grid">
        <div className="footer-section">
          <h3>Product</h3>
          <ul>
            <li><Link href="/features">Features</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/marketplace">Marketplace</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>Support</h3>
          <ul>
            <li><Link href="/support">Contact Support</Link></li>
            <li><Link href="/support#faq">FAQ</Link></li>
            <li><Link href="/feature-request">Feature Request</Link></li>
            <li><Link href="/legal/terms">Terms of Service</Link></li>
            <li><Link href="/legal/privacy">Privacy Policy</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>Developers</h3>
          <ul>
            <li><Link href="/developers">Developer Home</Link></li>
            <li><Link href="/developer-sdk">Developer SDK</Link></li>
            <li><Link href="/developers/dashboard">Developer Portal</Link></li>
            <li><Link href="/support">Developer Support</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>Company</h3>
          <ul>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/about#mission">Mission</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>Connect</h3>
          <div className="social-links">
            <a className="social-link" href="https://twitter.com/jualuma" target="_blank" rel="noreferrer" aria-label="X / Twitter">
              𝕏
            </a>
            <a className="social-link" href="https://discord.gg/jualuma" target="_blank" rel="noreferrer" aria-label="Discord">
              Disc
            </a>
            <a className="social-link" href="https://youtube.com/@jualuma" target="_blank" rel="noreferrer" aria-label="YouTube">
              YT
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2025 Intellifide, LLC. All rights reserved.</p>
        <p style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}>
          jualuma is for informational and educational purposes only. jualuma does not provide financial, investment, tax, or legal advice. Always consult qualified professionals for financial decisions.
        </p>
      </div>
    </div>
  </footer>
)
