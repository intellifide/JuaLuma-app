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


import { api } from './api';

export interface Document {
    id: string;
    uid: string;
    name: string;
    type: 'uploaded' | 'generated' | 'stored';
    fileType: string;
    date: string;
    size: string;
    size_bytes: number;
}

export const documentService = {
    getAll: async (): Promise<Document[]> => {
        const response = await api.get('/documents/');
        return response.data;
    },

    upload: async (file: File, type: 'uploaded' | 'generated' | 'stored' = 'uploaded'): Promise<Document> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await api.post('/documents/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getDownloadUrl: (id: string) => {
        return `/api/documents/${id}/download`;
    },

    getPreviewUrl: (id: string) => {
        return `/api/documents/${id}/preview`;
    }
};
