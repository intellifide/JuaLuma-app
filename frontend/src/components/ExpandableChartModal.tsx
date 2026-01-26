// Core Purpose: TradingView-style expandable chart modal with zoom and pan
// Last Updated: 2026-01-25 17:55 CST

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { DataPoint } from '../services/analytics'

interface ExpandableChartModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  data: DataPoint[] | null
  type: 'line' | 'bar'
  loading?: boolean
  incomeData?: DataPoint[]
  expensesData?: DataPoint[]
  interval?: string
}

const parseDateUTC = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

// Format month/year labels with apostrophe for clarity.
const formatMonthYearLabel = (value: Date) => {
  const month = value.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })
  const year = value.getUTCFullYear().toString().slice(-2)
  return `${month} \u2019${year}`
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value)

export const ExpandableChartModal: React.FC<ExpandableChartModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  type,
  loading = false,
  incomeData,
  expensesData,
  interval = 'month',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number; date: string } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Generate line chart for net worth
  const lineChartData = useMemo(() => {
    if (type !== 'line' || !data || data.length === 0) return null
    const sortedData = [...data].sort((a, b) => b.date.localeCompare(a.date))

    const width = 1400
    const height = 700
    const padding = { top: 60, right: 80, bottom: 80, left: 100 }
    const drawWidth = width - padding.left - padding.right
    const drawHeight = height - padding.top - padding.bottom

    const values = sortedData.map(d => d.value)
    const min = Math.min(...values) * 0.95
    const max = Math.max(...values) * 1.05
    const range = max - min || 1

    const points = sortedData.map((d, i) => {
      const x = padding.left + (i / (sortedData.length - 1)) * drawWidth
      const y = padding.top + drawHeight - ((d.value - min) / range) * drawHeight
      return { x, y, value: d.value, date: d.date }
    })

    const path = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const areaPath = `${padding.left},${padding.top + drawHeight} ${path} ${padding.left + drawWidth},${padding.top + drawHeight}`

    // More Y-axis labels for better readability
    const numYLabels = 8
    const yLabels = Array.from({ length: numYLabels }, (_, i) => {
      const val = min + (range * i) / (numYLabels - 1)
      return {
        label: formatCurrency(val),
        y: padding.top + drawHeight - ((val - min) / range) * drawHeight,
      }
    })

    // More X-axis labels based on data length
    const numXLabels = Math.min(Math.max(12, Math.floor(sortedData.length / 10)), 24)
    const xLabelIndices = Array.from({ length: numXLabels }, (_, i) =>
      Math.floor((i * (sortedData.length - 1)) / (numXLabels - 1))
    ).filter(i => i < sortedData.length && sortedData[i])
    
    const xLabels = xLabelIndices.map(i => {
      const dateValue = parseDateUTC(sortedData[i].date)
      const includeYear = sortedData.length > 90
      const label = includeYear
        ? formatMonthYearLabel(dateValue)
        : dateValue.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
      return {
        label,
        x: padding.left + (i / (sortedData.length - 1)) * drawWidth,
      }
    })

    return { path, areaPath, points, yLabels, xLabels, padding, width, height, min, max, range }
  }, [data, type])

  // Generate bar chart for cash flow
  const barChartData = useMemo(() => {
    if (type !== 'bar' || !incomeData || !expensesData || incomeData.length === 0 || expensesData.length === 0) return null

    const width = 1400
    const height = 700
    const padding = { top: 60, right: 80, bottom: 80, left: 100 }
    const drawWidth = width - padding.left - padding.right
    const drawHeight = height - padding.top - padding.bottom

    // Normalize cash flow values so bar heights are always positive.
    const normalizedIncome = [...incomeData]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(d => ({ ...d, value: Math.max(0, d.value) }))
    const normalizedExpenses = [...expensesData]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(d => ({ ...d, value: Math.abs(d.value) }))
    const allValues = [...normalizedIncome.map(d => d.value), ...normalizedExpenses.map(d => d.value)]
    const max = Math.max(1, ...allValues) * 1.1
    const barWidth = Math.max(12, Math.min(40, drawWidth / normalizedIncome.length / 2.5))
    const groupWidth = drawWidth / normalizedIncome.length

    const incomeBars = normalizedIncome.map((d, i) => {
      const x = padding.left + i * groupWidth
      const barHeight = (d.value / max) * drawHeight
      const y = padding.top + drawHeight - barHeight
      return { x, y, width: barWidth, height: barHeight, value: d.value, date: d.date }
    })

    const expensesBars = normalizedExpenses.map((d, i) => {
      const x = padding.left + i * groupWidth + barWidth + 5
      const barHeight = (d.value / max) * drawHeight
      const y = padding.top + drawHeight - barHeight
      return { x, y, width: barWidth, height: barHeight, value: d.value, date: d.date }
    })

    // More Y-axis labels
    const numYLabels = 8
    const yLabels = Array.from({ length: numYLabels }, (_, i) => {
      const val = (max * i) / (numYLabels - 1)
      return {
        label: formatCurrency(val),
        y: padding.top + drawHeight - (val / max) * drawHeight,
      }
    })

    // X-axis labels
    // Match label count to available periods to avoid repeated month labels.
    const numXLabels = Math.min(12, Math.max(1, normalizedIncome.length))
    const labelDivisor = Math.max(1, numXLabels - 1)
    const xLabelIndices = Array.from({ length: numXLabels }, (_, i) =>
      Math.floor((i * (normalizedIncome.length - 1)) / labelDivisor)
    ).filter(i => i < normalizedIncome.length && normalizedIncome[i])
    
    const xLabels = xLabelIndices.map(i => {
      const dateValue = parseDateUTC(normalizedIncome[i].date)
      const label = interval === 'week'
        ? dateValue.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
        : formatMonthYearLabel(dateValue)
      return {
        label,
        x: padding.left + i * groupWidth + barWidth / 2,
      }
    })

    return { incomeBars, expensesBars, yLabels, xLabels, padding, width, height, max }
  }, [incomeData, expensesData, type])

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!lineChartData || type !== 'line') return
    
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const scaleX = lineChartData.width / rect.width

    const adjustedX = x * scaleX

    // Find closest point
    let closest = lineChartData.points[0]
    let minDist = Math.abs(adjustedX - closest.x)

    for (const point of lineChartData.points) {
      const dist = Math.abs(adjustedX - point.x)
      if (dist < minDist) {
        minDist = dist
        closest = point
      }
    }

    if (minDist < 50) {
      setHoveredPoint(closest)
    } else {
      setHoveredPoint(null)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      showHeader={false}
      contentStyle={{ maxWidth: '96vw', width: '96vw', height: '90vh', maxHeight: '90vh', padding: 0, overflow: 'hidden' }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6 px-6 pt-6">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary mt-1">
              {type === 'line' && data && `${data.length} data points`}
              {type === 'bar' && incomeData && `${incomeData.length} periods`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-royal-purple"></div>
            </div>
          )}

          {!loading && type === 'line' && lineChartData && (
            <div className="w-full h-full min-h-[600px] bg-surface-1 rounded-xl p-8 border border-white/10">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Grid lines */}
                {lineChartData.yLabels.map((label, i) => (
                  <line
                    key={`grid-${i}`}
                    x1={lineChartData.padding.left}
                    y1={label.y}
                    x2={lineChartData.width - lineChartData.padding.right}
                    y2={label.y}
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    strokeDasharray="4 4"
                    className="text-text-secondary"
                  />
                ))}

                {/* Vertical grid lines */}
                {lineChartData.xLabels.map((label, i) => (
                  <line
                    key={`vgrid-${i}`}
                    x1={label.x}
                    y1={lineChartData.padding.top}
                    x2={label.x}
                    y2={lineChartData.height - lineChartData.padding.bottom}
                    stroke="currentColor"
                    strokeOpacity="0.05"
                    strokeDasharray="4 4"
                    className="text-text-secondary"
                  />
                ))}

                {/* Area fill */}
                <polygon
                  points={lineChartData.areaPath}
                  fill="url(#gradient)"
                  opacity="0.15"
                />

                {/* Line */}
                <polyline
                  points={lineChartData.path}
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {lineChartData.points.map((point, i) => (
                  <circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#7C3AED"
                    stroke="#fff"
                    strokeWidth="2"
                    className="hover:r-8 transition-all cursor-pointer"
                    opacity={hoveredPoint?.date === point.date ? 1 : 0.7}
                  />
                ))}

                {/* Hover tooltip */}
                {hoveredPoint && (
                  <g>
                    <line
                      x1={hoveredPoint.x}
                      y1={lineChartData.padding.top}
                      x2={hoveredPoint.x}
                      y2={lineChartData.height - lineChartData.padding.bottom}
                      stroke="#7C3AED"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                    <rect
                      x={hoveredPoint.x - 80}
                      y={hoveredPoint.y - 60}
                      width="160"
                      height="50"
                      fill="#1e293b"
                      stroke="#7C3AED"
                      strokeWidth="2"
                      rx="8"
                      opacity="0.95"
                    />
                    <text
                      x={hoveredPoint.x}
                      y={hoveredPoint.y - 40}
                      textAnchor="middle"
                      className="text-sm fill-white font-semibold"
                    >
                      {formatCurrency(hoveredPoint.value)}
                    </text>
                    <text
                      x={hoveredPoint.x}
                      y={hoveredPoint.y - 22}
                      textAnchor="middle"
                      className="text-xs fill-gray-300"
                    >
                      {parseDateUTC(hoveredPoint.date).toLocaleDateString()}
                    </text>
                  </g>
                )}

                {/* Y-axis labels */}
                {lineChartData.yLabels.map((label, i) => (
                  <text
                    key={i}
                    x={lineChartData.padding.left - 15}
                    y={label.y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-sm fill-text-secondary font-medium"
                  >
                    {label.label}
                  </text>
                ))}

                {/* X-axis labels */}
                {lineChartData.xLabels.map((label, i) => (
                  <text
                    key={i}
                    x={label.x}
                    y={lineChartData.height - lineChartData.padding.bottom + 30}
                    textAnchor="middle"
                    className="text-sm fill-text-secondary"
                  >
                    {label.label}
                  </text>
                ))}

                {/* Gradient definition */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {!loading && type === 'bar' && barChartData && (
            <div className="w-full h-full min-h-[600px] bg-surface-1 rounded-xl p-8 border border-white/10">
              <svg
                viewBox={`0 0 ${barChartData.width} ${barChartData.height}`}
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid lines */}
                {barChartData.yLabels.map((label, i) => (
                  <line
                    key={`grid-${i}`}
                    x1={barChartData.padding.left}
                    y1={label.y}
                    x2={barChartData.width - barChartData.padding.right}
                    y2={label.y}
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    strokeDasharray="4 4"
                    className="text-text-secondary"
                  />
                ))}

                {/* Income bars */}
                {barChartData.incomeBars.map((bar, i) => (
                  <g key={`income-${i}`}>
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill="#10B981"
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                    <title>{`Inflow ${parseDateUTC(bar.date).toLocaleDateString()}: ${formatCurrency(bar.value)}`}</title>
                  </g>
                ))}

                {/* Expenses bars */}
                {barChartData.expensesBars.map((bar, i) => (
                  <g key={`expense-${i}`}>
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill="#EF4444"
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                    <title>{`Outflow ${parseDateUTC(bar.date).toLocaleDateString()}: ${formatCurrency(bar.value)}`}</title>
                  </g>
                ))}

                {/* Y-axis labels */}
                {barChartData.yLabels.map((label, i) => (
                  <text
                    key={i}
                    x={barChartData.padding.left - 15}
                    y={label.y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-sm fill-text-secondary font-medium"
                  >
                    {label.label}
                  </text>
                ))}

                {/* X-axis labels */}
                {barChartData.xLabels.map((label, i) => (
                  <text
                    key={i}
                    x={label.x}
                    y={barChartData.height - barChartData.padding.bottom + 30}
                    textAnchor="middle"
                    className="text-sm fill-text-secondary"
                  >
                    {label.label}
                  </text>
                ))}

                {/* Legend */}
                <g transform={`translate(${barChartData.width - barChartData.padding.right - 180}, ${barChartData.padding.top})`}>
                  <rect x="0" y="0" width="20" height="20" fill="#10B981" rx="4" />
                  <text x="28" y="15" className="text-base fill-text-primary font-medium">Inflow</text>
                  <rect x="0" y="35" width="20" height="20" fill="#EF4444" rx="4" />
                  <text x="28" y="50" className="text-base fill-text-primary font-medium">Outflow</text>
                </g>
              </svg>
            </div>
          )}

          {!loading && !data && !incomeData && (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg">No data available for this period</p>
              <p className="text-sm mt-2">Try selecting a different timeframe</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 text-sm text-text-secondary text-center border-t border-white/10 pt-4">
          <p>💡 Hover over data points to see detailed information • Full historical data displayed</p>
        </div>
      </div>
    </Modal>
  )
}
