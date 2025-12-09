// Updated 2025-12-08 21:49 CST by ChatGPT
import axios, { AxiosError, AxiosHeaders } from 'axios'
import { clearCachedToken, getIdToken } from './auth'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use(
  async (config) => {
    const token = await getIdToken()
    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const message =
      (error.response?.data as { detail?: string; message?: string } | undefined)
        ?.detail ||
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message

    if (status === 401) {
      clearCachedToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      window.alert('You do not have permission to perform this action.')
    } else if (status && status >= 500) {
      window.alert('A server error occurred. Please try again shortly.')
    }

    return Promise.reject(new Error(message))
  },
)

export { api }
