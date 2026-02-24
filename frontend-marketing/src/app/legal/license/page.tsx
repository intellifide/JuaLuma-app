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

import path from 'path';
import { readFile } from 'fs/promises';

async function loadPolyFormText(): Promise<string> {
  const licensePath = path.join(
    process.cwd(),
    'public',
    'PolyForm-Noncommercial-1.0.0.txt',
  );
  return readFile(licensePath, 'utf8');
}

export default async function LicensePage() {
  const polyFormText = await loadPolyFormText();

  return (
    <div className="container py-24 max-w-5xl">
      <h1 className="text-5xl font-extrabold mb-10">
        Full <span className="text-primary">License</span>
      </h1>
      <div className="space-y-8 text-muted leading-relaxed">
        <p className="italic">Last Updated: February 23, 2026</p>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. JuaLuma License Notice</h2>
          <p>
            JuaLuma is owned and operated by Intellifide LLC and is provided under
            PolyForm Noncommercial License 1.0.0.
          </p>
          <p className="mt-4">
            Commercial resale, repackaging, paid redistribution, and enterprise
            deployment of JuaLuma are prohibited.
          </p>
        </section>

        <section className="bg-surface-1 p-8 rounded-xl border border-white/5 shadow-inner">
          <h2 className="text-2xl font-bold text-white mb-4">2. Full PolyForm Noncommercial 1.0.0 Text</h2>
          <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-text-secondary font-mono m-0">
            {polyFormText}
          </pre>
        </section>
      </div>
    </div>
  );
}
