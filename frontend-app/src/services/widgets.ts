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

import { api } from './api';
import { Widget, PaginatedResponse } from '../types';

export const widgetService = {
    list: async (category?: string, search?: string, page: number = 1, pageSize: number = 10) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        params.append('page', page.toString());
        params.append('page_size', pageSize.toString());

        // Use trailing slash to avoid backend redirect (307) that breaks in-browser fetch.
        const response = await api.get<PaginatedResponse<Widget>>(`/widgets/?${params.toString()}`);
        return response.data;
    },

    listMine: async () => {
        try {
            const response = await api.get<Widget[]>('/widgets/mine/');
            return response.data;
        } catch (e: unknown) {
            // Fallback if endpoint 404s during transition
            return [];
        }
    },

    submit: async (data: Omit<Widget, 'id' | 'developer_uid' | 'created_at' | 'updated_at' | 'downloads' | 'rating_avg' | 'rating_count' | 'status'>) => {
        const response = await api.post<Widget>('/widgets/', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Widget>) => {
        const response = await api.patch<Widget>(`/widgets/${id}/`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/widgets/${id}/`);
        return response.data;
    },

    download: async (id: string) => {
        const response = await api.post(`/widgets/${id}/download/`);
        return response.data;
    },

    rate: async (id: string, rating: number, review?: string) => {
        const response = await api.post(`/widgets/${id}/rate/`, { rating, review });
        return response.data;
    }
};
