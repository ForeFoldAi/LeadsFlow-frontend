import axios, { AxiosInstance } from 'axios';

const leadGenAxios: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_LEAD_GENERATOR_URL || 'http://localhost:8000',
  timeout: 180000,
  headers: { 'Content-Type': 'application/json' },
});

export interface GenerateLeadsRequest {
  sector: string;
  city: string;
  country?: string;
  sources?: string[];
  max_per_source?: number;
  delay?: number;
  min_score?: number;
}

export interface LeadResult {
  name: string;
  phone: string;
  email: string;
  city: string;
  category: string;
  sources: string;
  website: string;
}

export interface GenerateResponse {
  session_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  sector: string;
  city: string;
  country: string;
  total: number;
  leads: LeadResult[];
  error?: string;
  created_at: string;
  completed_at?: string;
  download_csv: string;
  download_excel: string;
}

export interface ScrapeRequest {
  keyword: string;
  location: string;
  sources?: string[];
  max_per_source?: number;
  min_score?: number;
  country?: string;
  delay?: number;
}

export interface JobRead {
  id: string;
  keyword: string;
  location: string;
  sources: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  max_per_source: number;
  min_score: number;
  country: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
  leads_count?: number;
}

export interface LeadRead {
  id: string;
  job_id?: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  category: string;
  city: string;
  state: string;
  sources: string;
  scraped_at: string;
}

export interface LeadListResponse {
  total: number;
  leads: LeadRead[];
}

const leadGeneratorService = {
  startGeneration: async (data: GenerateLeadsRequest): Promise<GenerateResponse> => {
    const response = await leadGenAxios.post('/api/v1/generate', data);
    return response.data;
  },

  pollGeneration: async (sessionId: string): Promise<GenerateResponse> => {
    const response = await leadGenAxios.get(`/api/v1/generate/${sessionId}`);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await leadGenAxios.delete(`/api/v1/generate/${sessionId}`);
  },

  getDownloadCsvUrl: (sessionId: string): string => {
    const baseUrl = import.meta.env.VITE_LEAD_GENERATOR_URL || 'http://localhost:8000';
    return `${baseUrl}/api/v1/download/csv?session_id=${sessionId}`;
  },

  getDownloadExcelUrl: (sessionId: string): string => {
    const baseUrl = import.meta.env.VITE_LEAD_GENERATOR_URL || 'http://localhost:8000';
    return `${baseUrl}/api/v1/download/excel?session_id=${sessionId}`;
  },

  startScrapeJob: async (data: ScrapeRequest): Promise<JobRead> => {
    const response = await leadGenAxios.post('/api/v1/scrape', data);
    return response.data;
  },

  getScrapeJobs: async (): Promise<JobRead[]> => {
    const response = await leadGenAxios.get('/api/v1/scrape/jobs');
    return response.data;
  },

  getScrapeJob: async (jobId: string): Promise<JobRead> => {
    const response = await leadGenAxios.get(`/api/v1/scrape/jobs/${jobId}`);
    return response.data;
  },

  deleteScrapeJob: async (jobId: string): Promise<void> => {
    await leadGenAxios.delete(`/api/v1/scrape/jobs/${jobId}`);
  },

  getLeads: async (params?: { job_id?: string; min_score?: number; limit?: number; offset?: number }): Promise<LeadListResponse> => {
    const response = await leadGenAxios.get('/api/v1/leads', { params });
    return response.data;
  },

  getLead: async (leadId: string): Promise<LeadRead> => {
    const response = await leadGenAxios.get(`/api/v1/leads/${leadId}`);
    return response.data;
  },

  deleteLead: async (leadId: string): Promise<void> => {
    await leadGenAxios.delete(`/api/v1/leads/${leadId}`);
  },

  deleteLeads: async (jobId?: string): Promise<void> => {
    await leadGenAxios.delete('/api/v1/leads', { params: jobId ? { job_id: jobId } : undefined });
  },

  getExportCsvUrl: (jobId?: string, minScore?: number): string => {
    const baseUrl = import.meta.env.VITE_LEAD_GENERATOR_URL || 'http://localhost:8000';
    const params = new URLSearchParams();
    if (jobId) params.set('job_id', jobId);
    if (minScore !== undefined) params.set('min_score', String(minScore));
    const qs = params.toString();
    return `${baseUrl}/api/v1/export/csv${qs ? `?${qs}` : ''}`;
  },

  getExportExcelUrl: (jobId?: string, minScore?: number): string => {
    const baseUrl = import.meta.env.VITE_LEAD_GENERATOR_URL || 'http://localhost:8000';
    const params = new URLSearchParams();
    if (jobId) params.set('job_id', jobId);
    if (minScore !== undefined) params.set('min_score', String(minScore));
    const qs = params.toString();
    return `${baseUrl}/api/v1/export/excel${qs ? `?${qs}` : ''}`;
  },

  getSectors: async (): Promise<string[]> => {
    const response = await leadGenAxios.get('/api/v1/sectors');
    return response.data.sectors;
  },
};

export default leadGeneratorService;
