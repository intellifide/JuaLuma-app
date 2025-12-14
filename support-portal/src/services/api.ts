import axios, { AxiosError } from 'axios';
import { auth } from '../firebase';

// Use same base URL pattern as main app if needed, or hardcode relative to proxy
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle global errors if needed (e.g., specific 401 handling)
        return Promise.reject(error);
    }
);
