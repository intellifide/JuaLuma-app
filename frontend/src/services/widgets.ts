import { api } from './api';
import { Widget } from '../types';

export const widgetService = {
    list: async (category?: string, search?: string) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        const response = await api.get<Widget[]>(`/widgets?${params.toString()}`);
        return response.data;
    },

    listMine: async () => {
        try {
            const response = await api.get<Widget[]>('/widgets/mine');
            return response.data;
        } catch (e: any) {
            // Fallback if endpoint 404s during transition
            return [];
        }
    },

    submit: async (data: any) => {
        const response = await api.post<Widget>('/widgets', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.patch<Widget>(`/widgets/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/widgets/${id}`);
        return response.data;
    },

    download: async (id: string) => {
        const response = await api.post(`/widgets/${id}/download`);
        return response.data;
    },

    rate: async (id: string, rating: number, review?: string) => {
        const response = await api.post(`/widgets/${id}/rate`, { rating, review });
        return response.data;
    }
};
