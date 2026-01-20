
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
