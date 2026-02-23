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

import React from 'react';

export default function LicensePage() {
    return (
        <div className="container py-24 max-w-4xl">
            <h1 className="text-5xl font-extrabold mb-10">License <span className="text-primary">Notice</span></h1>
            <div className="space-y-8 text-muted leading-relaxed">
                <p className="italic">Last Updated: February 23, 2026</p>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">1. Ownership</h2>
                    <p>
                        JuaLuma is a brand and software product owned and operated by Intellifide LLC. All rights not explicitly granted by license are reserved by Intellifide LLC.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">2. License Type</h2>
                    <p>
                        This project is source-available under the PolyForm Noncommercial License 1.0.0.
                    </p>
                    <p className="mt-4">
                        You may review, run, and modify the software for personal and other noncommercial use under those terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">3. Prohibited Commercial Use</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>No resale of the application or source code.</li>
                        <li>No paid redistribution, repackaging, or white-label resale.</li>
                        <li>No commercial or enterprise deployment without separate written permission from Intellifide LLC.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">4. Developer and Community Use</h2>
                    <p>
                        You may audit the codebase, run local instances, and build compatible widgets/plugins for noncommercial ecosystem use.
                    </p>
                    <p className="mt-4">
                        Contributions to this repository remain subject to this same source-available license model unless otherwise documented.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">5. Canonical Legal Text</h2>
                    <p>
                        The complete binding license text is available at:
                    </p>
                    <p className="mt-4">
                        <a href="/PolyForm-Noncommercial-1.0.0.txt" className="text-primary underline" title="PolyForm Noncommercial 1.0.0">
                            PolyForm-Noncommercial-1.0.0.txt
                        </a>
                    </p>
                    <p className="mt-4">
                        If this page and the PolyForm text differ, the full PolyForm text controls.
                    </p>
                </section>

                <section className="bg-surface-1 p-8 rounded-xl border border-white/5 shadow-inner">
                    <h2 className="text-2xl font-bold text-white mb-4">Commercial Licensing Contact</h2>
                    <p>
                        For commercial licensing, enterprise deployment, or partnership inquiries, contact
                        {' '}
                        <a href="mailto:legal@intellifide.com" className="text-primary underline">legal@intellifide.com</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
