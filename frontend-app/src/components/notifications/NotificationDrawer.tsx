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

import React, { useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';
import { useUserTimeZone } from '../../hooks/useUserTimeZone';
import { formatDateTime } from '../../utils/datetime';

interface LocalNotification {
    id: string;
    title: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

// Simple fetcher for SWR
const fetcher = (url: string) => api.get(url).then(res => res.data);

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
    const toast = useToast();
    const timeZone = useUserTimeZone();

    // Fetch notifications only when drawer is open
    const { data: notifications = [] } = useSWR<LocalNotification[]>(
        isOpen ? '/notifications' : null,
        fetcher,
        { refreshInterval: 30000 }
    );

    const markAsRead = async (id: string) => {
        try {
            await api.post(`/notifications/${id}/read`);
            // Optimistic update or revalidate
            mutate('/notifications');
        } catch (err) {
            console.error(err);
            toast.show("Failed to mark as read", "error");
        }
    };

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-overlay transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-surface-1 border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface-1">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        {/* Bell Icon */}
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Notifications
                    </h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close">
                        {/* X Icon */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {notifications.length === 0 ? (
                        <div className="text-center text-text-secondary py-12">
                            <p>No notifications yet.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`p-4 rounded-lg border transition-colors ${n.is_read
                                    ? 'bg-surface-2 border-transparent opacity-75'
                                    : 'bg-surface-1 border-primary/30 shadow-sm'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-medium text-sm ${!n.is_read ? 'text-primary' : 'text-text-primary'}`}>
                                        {n.title || 'Notification'}
                                    </h3>
                                    {!n.is_read && (
                                        <button
                                            title="Mark as read"
                                            className="text-text-secondary hover:text-primary transition-colors p-1"
                                            onClick={() => markAsRead(n.id)}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-text-secondary mb-3 leading-relaxed break-words">
                                    {n.message}
                                </p>
                                <div className="flex items-center justify-between text-xs text-text-muted">
                                    <span>{formatDateTime(n.created_at, timeZone)}</span>
                                    {n.is_read && (
                                        <span className="flex items-center gap-1">
                                            {/* Check Icon */}
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Read
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
