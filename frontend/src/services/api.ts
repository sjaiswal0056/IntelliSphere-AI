import axios from 'axios';
import { OverviewMetrics, MLModelItem, ExperimentItem, DatasetItem, DatasetDetail } from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('intellisphere_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('intellisphere_token');
      localStorage.removeItem('intellisphere_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: any) => (await api.post('/auth/login', credentials)).data,
  register: async (data: any) => (await api.post('/auth/register', data)).data,
  getMe: async () => (await api.get('/auth/me')).data,
};

export const platformApi = {
  getOverviewMetrics: async (): Promise<OverviewMetrics> => (await api.get('/overview/metrics')).data,
  listModels: async (): Promise<MLModelItem[]> => (await api.get('/models')).data,
  listExperiments: async (): Promise<ExperimentItem[]> => (await api.get('/experiments')).data,
};

export const datasetsApi = {
  list: async (): Promise<DatasetItem[]> => (await api.get('/datasets')).data,
  get: async (id: number): Promise<DatasetDetail> => (await api.get(`/datasets/${id}`)).data,
  upload: async (formData: FormData): Promise<DatasetDetail> =>
    (await api.post('/datasets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
  delete: async (id: number) => (await api.delete(`/datasets/${id}`)).data,
};

export const retailApi = {
  getForecast: async (params: { horizon_days: number; store_id?: string; category?: string }) =>
    (await api.post('/retail/forecast', params)).data,
  getSegments: async () => (await api.get('/retail/segments')).data,
  getRepeatPurchase: async () => (await api.get('/retail/repeat-purchase')).data,
  simulateInventory: async (params: any) => (await api.post('/retail/inventory', params)).data,
};

export const fraudApi = {
  getAnalytics: async () => (await api.get('/fraud/analytics')).data,
  predict: async (data: any) => (await api.post('/fraud/predict', data)).data,
};

export const maintenanceApi = {
  getAnalytics: async () => (await api.get('/maintenance/analytics')).data,
  predict: async (data: any) => (await api.post('/maintenance/predict', data)).data,
};

export const healthcareApi = {
  getAnalytics: async () => (await api.get('/healthcare/analytics')).data,
  predict: async (data: any) => (await api.post('/healthcare/research-predict', data)).data,
};

export const recommendationsApi = {
  getAnalytics: async () => (await api.get('/recommendations/analytics')).data,
  getUsers: async () => (await api.get('/recommendations/users')).data,
  getForUser: async (userId: number, k: number = 10, algorithm: string = 'hybrid') =>
    (await api.get(`/recommendations/user/${userId}?k=${k}&algorithm=${algorithm}`)).data,
  getSimilar: async (movieId: number, k: number = 5) =>
    (await api.get(`/recommendations/similar/${movieId}?k=${k}`)).data,
};

export const autodsApi = {
  analyze: async (datasetId: number) => (await api.post('/autods/analyze', { dataset_id: datasetId })).data,
  startTraining: async (data: { dataset_id: number; target_column: string; task_type: string; user_approval_granted: boolean }) =>
    (await api.post('/autods/train', data)).data,
  getJobStatus: async (jobId: string) => (await api.get(`/autods/jobs/${jobId}`)).data,
  getResults: async (jobId: string) => (await api.get(`/autods/results/${jobId}`)).data,
};

export const copilotApi = {
  chat: async (message: string, moduleContext: string, conversationId?: number) =>
    (await api.post('/copilot/chat', { message, module_context: moduleContext, conversation_id: conversationId })).data,
  getHistory: async (conversationId: number) => (await api.get(`/copilot/history/${conversationId}`)).data,
};

export default api;
