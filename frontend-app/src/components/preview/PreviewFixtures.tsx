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

// Core Purpose: Local preview fixtures for premium UI parity.
// Last Updated: 2026-01-27

import React from 'react'
import {
  previewAssets,
  previewBudgets,
  previewCategorization,
  previewDashboard,
  previewHealth,
} from '../../utils/previewData'

const PreviewFrame: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="feature-preview">
    <div>
      <div className="preview-header">
        <span className="preview-dot" />
        <span className="preview-dot" />
        <span className="preview-dot" />
      </div>
      {children}
    </div>
  </div>
)

export const PreviewFixtures: React.FC = () => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <PreviewFrame>
        <div className="preview-dashboard">
          <div className="preview-stats">
            {previewDashboard.stats.map((stat) => (
              <div key={stat.label} className="preview-stat">
                <span className="preview-stat-label">{stat.label}</span>
                <span className="preview-stat-value">{stat.value}</span>
                {stat.change && (
                  <span
                    className={`preview-stat-change ${
                      stat.changeTone === 'positive' ? 'positive' : ''
                    }`}
                  >
                    {stat.change}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="preview-chart-mini">
            <svg viewBox="0 0 200 60" aria-hidden="true">
              <polyline
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                points={previewDashboard.sparkline
                  .map((val, idx) => `${idx * 18},${60 - val}`)
                  .join(' ')}
              />
            </svg>
          </div>
          <div className="preview-accounts">
            {previewDashboard.accounts.map((account) => (
              <div key={account.name} className="preview-account">
                <span>{account.name}</span>
                <span>{account.value}</span>
              </div>
            ))}
          </div>
        </div>
      </PreviewFrame>

      <PreviewFrame>
        <div className="preview-categorization">
          {previewCategorization.transactions.map((txn) => (
            <div
              key={txn.name}
              className={`preview-transaction ${txn.highlight ? 'highlight' : ''}`}
            >
              <div className="preview-tx-icon">{txn.icon}</div>
              <div className="preview-tx-details">
                <span className="preview-tx-name">{txn.name}</span>
                <span className="preview-tx-amount">{txn.amount}</span>
              </div>
              <span
                className={`preview-category-badge ${
                  txn.highlight ? 'pending' : ''
                }`}
              >
                {txn.category}
              </span>
            </div>
          ))}
          <div className="preview-ai-suggest">
            <span>{previewCategorization.suggestion}</span>
            <button className="preview-btn-sm" type="button">
              Apply
            </button>
          </div>
        </div>
      </PreviewFrame>

      <PreviewFrame>
        <div className="preview-budget">
          <div className="preview-budget-title">Budget Momentum</div>
          {previewBudgets.items.map((item) => (
            <div key={item.name} className="preview-budget-item">
              <div className="preview-budget-row">
                <span>{item.name}</span>
                <span>
                  {item.spent} / {item.limit}
                </span>
              </div>
              <div className="preview-progress-bar" aria-hidden="true">
                <div
                  className={`preview-progress-fill ${
                    item.tone === 'warning'
                      ? 'warning'
                      : item.tone === 'accent'
                      ? 'accent'
                      : ''
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
          <span className="preview-alert">{previewBudgets.alert}</span>
        </div>
      </PreviewFrame>

      <PreviewFrame>
        <div className="preview-health">
          <div className="preview-health-grid">
            <div className="preview-health-metric">
              <svg className="preview-donut" viewBox="0 0 36 36" aria-hidden="true">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                  fill="none"
                  stroke="var(--border-color)"
                  strokeWidth="4"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray={`${previewHealth.score}, 100`}
                />
              </svg>
              <span className="preview-health-value">{previewHealth.score}</span>
              <span className="preview-health-name">Health Score</span>
            </div>
            <div className="preview-health-stats">
              {previewHealth.stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`preview-health-stat ${
                    stat.positive ? 'highlight' : ''
                  }`}
                >
                  <span className="preview-health-stat-icon">{stat.icon}</span>
                  <div>
                    <span className="preview-health-stat-label">{stat.label}</span>
                    <span
                      className={`preview-health-stat-value ${
                        stat.positive ? 'positive' : ''
                      }`}
                    >
                      {stat.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PreviewFrame>

      <PreviewFrame>
        <div className="preview-assets">
          <div className="preview-assets-title">Manual Assets Snapshot</div>
          {previewAssets.items.map((asset) => (
            <div key={asset.name} className="preview-asset-item">
              <div className="preview-asset-icon">{asset.icon}</div>
              <div className="preview-asset-details">
                <span className="preview-asset-name">{asset.name}</span>
                <span className="preview-asset-date">{asset.date}</span>
              </div>
              <span className="preview-asset-value">{asset.value}</span>
            </div>
          ))}
          <div className="preview-assets-total">
            <span>Total</span>
            <span>{previewAssets.total}</span>
          </div>
        </div>
      </PreviewFrame>
    </div>
  )
}
