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

// Created 2025-12-11 13:00 CST
import React from 'react';
import { WidgetProps } from '../types';

export const HelloWorldWidget: React.FC<WidgetProps> = ({ context }) => {
    const styles = {
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: context.theme === 'dark' ? '#1f2937' : '#ffffff',
        color: context.theme === 'dark' ? '#f3f4f6' : '#1f2937',
        border: '1px solid ' + (context.theme === 'dark' ? '#374151' : '#e5e7eb'),
    };

    return (
        <div style={styles}>
            <h3 style={{ margin: '0 0 10px 0' }}>Hello World Widget</h3>
            <p>This is a simple widget demonstrating context usage.</p>
            <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
                <strong>Context:</strong>
                <ul>
                    <li>Theme: {context.theme}</li>
                    <li>Currency: {context.currency}</li>
                    <li>Locale: {context.locale}</li>
                </ul>
            </div>
        </div>
    );
};
