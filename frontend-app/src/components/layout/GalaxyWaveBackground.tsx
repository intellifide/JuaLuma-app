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

export const GalaxyWaveBackground: React.FC = () => {
  return (
    <div className="galaxy-wave-background" aria-hidden="true">
      <div className="galaxy-wave-gradient" />
      <svg className="galaxy-wave-network" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="galaxyLineA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(84, 205, 255, 0.12)" />
            <stop offset="50%" stopColor="rgba(113, 152, 255, 0.35)" />
            <stop offset="100%" stopColor="rgba(192, 120, 255, 0.12)" />
          </linearGradient>
          <linearGradient id="galaxyLineB" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(126, 232, 255, 0.08)" />
            <stop offset="50%" stopColor="rgba(128, 162, 255, 0.24)" />
            <stop offset="100%" stopColor="rgba(235, 160, 255, 0.12)" />
          </linearGradient>
          <radialGradient id="galaxyNode" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(229, 245, 255, 0.95)" />
            <stop offset="100%" stopColor="rgba(150, 181, 255, 0)" />
          </radialGradient>
        </defs>

        <g className="galaxy-wave-curves">
          <path d="M-80 670 C 120 610, 280 640, 420 690 C 550 736, 710 760, 860 726 C 1000 694, 1180 610, 1360 640 C 1520 670, 1670 742, 1760 765" />
          <path d="M-120 760 C 80 700, 250 730, 390 792 C 540 850, 700 874, 870 832 C 1030 790, 1200 700, 1380 732 C 1540 760, 1690 824, 1780 862" />
          <path d="M-70 850 C 150 790, 300 832, 470 895 C 620 950, 800 965, 980 920 C 1140 880, 1330 805, 1530 842 C 1650 865, 1740 906, 1810 940" />
          <path d="M-90 560 C 120 500, 290 522, 470 570 C 620 610, 800 634, 980 598 C 1140 564, 1310 502, 1490 528 C 1610 546, 1720 592, 1810 628" />
        </g>

        <g className="galaxy-wave-links">
          <polyline points="70,860 250,760 430,820 610,720 800,790 980,700 1170,770 1360,700 1530,760" />
          <polyline points="130,760 320,660 510,730 700,640 890,710 1090,625 1280,694 1460,628" />
          <polyline points="40,670 210,590 390,650 570,570 760,640 940,560 1140,630 1320,560 1500,620" />
          <polyline points="180,900 360,820 540,900 720,810 900,890 1080,812 1260,890 1450,822" />

          <line x1="250" y1="760" x2="320" y2="660" />
          <line x1="430" y1="820" x2="510" y2="730" />
          <line x1="610" y1="720" x2="700" y2="640" />
          <line x1="800" y1="790" x2="890" y2="710" />
          <line x1="980" y1="700" x2="1090" y2="625" />
          <line x1="1170" y1="770" x2="1280" y2="694" />
          <line x1="1360" y1="700" x2="1460" y2="628" />
          <line x1="360" y1="820" x2="390" y2="650" />
          <line x1="720" y1="810" x2="760" y2="640" />
          <line x1="1080" y1="812" x2="1140" y2="630" />
        </g>

        <g className="galaxy-wave-nodes">
          <circle cx="70" cy="860" r="7" />
          <circle cx="250" cy="760" r="6" />
          <circle cx="430" cy="820" r="6" />
          <circle cx="610" cy="720" r="6" />
          <circle cx="800" cy="790" r="7" />
          <circle cx="980" cy="700" r="6" />
          <circle cx="1170" cy="770" r="6" />
          <circle cx="1360" cy="700" r="7" />
          <circle cx="1530" cy="760" r="6" />

          <circle cx="130" cy="760" r="5" />
          <circle cx="320" cy="660" r="6" />
          <circle cx="510" cy="730" r="6" />
          <circle cx="700" cy="640" r="7" />
          <circle cx="890" cy="710" r="6" />
          <circle cx="1090" cy="625" r="7" />
          <circle cx="1280" cy="694" r="6" />
          <circle cx="1460" cy="628" r="6" />

          <circle cx="40" cy="670" r="5" />
          <circle cx="210" cy="590" r="6" />
          <circle cx="390" cy="650" r="5" />
          <circle cx="570" cy="570" r="6" />
          <circle cx="760" cy="640" r="6" />
          <circle cx="940" cy="560" r="7" />
          <circle cx="1140" cy="630" r="6" />
          <circle cx="1320" cy="560" r="6" />
          <circle cx="1500" cy="620" r="7" />
        </g>
      </svg>
      <div className="galaxy-wave-haze" />
    </div>
  )
}
