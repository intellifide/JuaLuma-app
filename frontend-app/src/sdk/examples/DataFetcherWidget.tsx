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
import React, { useState } from 'react';
import { WidgetProps } from '../types';

export const DataFetcherWidget: React.FC<WidgetProps> = ({ client, context }) => {
    const [data, setData] = useState<unknown>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const styles = {
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: context.theme === 'dark' ? '#1f2937' : '#ffffff',
        color: context.theme === 'dark' ? '#f3f4f6' : '#1f2937',
        border: '1px solid ' + (context.theme === 'dark' ? '#374151' : '#e5e7eb'),
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // In a real scenario, this would be a proxied request
            // For this example, we'll try to fetch a public or simple endpoint
            // Assuming client.request handles the base URL
            const response = await client.request('/health');
            setData(response);
        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles}>
            <h3 style={{ margin: '0 0 10px 0' }}>Data Fetcher Widget</h3>
            <p>Demonstrates using jualumaClient to fetch data.</p>

            <button
                onClick={fetchData}
                disabled={loading}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                }}
            >
                {loading ? 'Fetching...' : 'Fetch Data'}
            </button>

            {error && (
                <div style={{ marginTop: '10px', color: '#ef4444' }}>
                    Error: {error}
                </div>
            )}

            {data && (
                <div style={{ marginTop: '10px' }}>
                    <strong>Response:</strong>
                    <pre style={{
                        backgroundColor: context.theme === 'dark' ? '#111827' : '#f3f4f6',
                        padding: '10px',
                        borderRadius: '4px',
                        overflowX: 'auto',
                        fontSize: '0.85em'
                    }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};
