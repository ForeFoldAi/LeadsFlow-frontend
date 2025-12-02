import axiosInstance from './axios.config';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadResponse,
  GetLeadsQuery,
  PaginatedLeadsResponse,
  ImportLeadsDto,
  ImportLeadsResponse,
} from './types';

export const leadsService = {
  /**
   * Get all leads with pagination and filters
   */
  getAllLeads: async (query?: GetLeadsQuery): Promise<PaginatedLeadsResponse> => {
    // Format query parameters - handle status array properly
    const params: any = { ...query };
    
    // Ensure status is properly formatted for the API
    if (params.status) {
      if (Array.isArray(params.status) && params.status.length > 0) {
        // Normalize status values (handle variations like "new" vs "new lead")
        const normalizedStatuses = params.status.map((s: string) => {
          const normalized = s.toLowerCase().trim();
          // Map variations to standard values
          if (normalized === 'new lead') return 'new';
          return normalized;
        });
        params.status = normalizedStatuses;
      } else if (typeof params.status === 'string' && params.status.trim() !== '') {
        // Normalize single status value
        const normalized = params.status.toLowerCase().trim();
        params.status = normalized === 'new lead' ? 'new' : normalized;
      } else {
        // Remove empty or invalid status
        delete params.status;
      }
    }
    
    const response = await axiosInstance.get<PaginatedLeadsResponse>('/leads', {
      params: params,
      paramsSerializer: {
        indexes: null, // Serialize arrays as status=value1&status=value2 (not status[]=value1)
      },
    });
    return response.data;
  },

  /**
   * Get lead by ID
   */
  getLeadById: async (id: string): Promise<LeadResponse> => {
    const response = await axiosInstance.get<LeadResponse>(`/leads/${id}`);
    return response.data;
  },

  /**
   * Create new lead
   */
  createLead: async (data: CreateLeadDto): Promise<LeadResponse> => {
    const response = await axiosInstance.post<LeadResponse>('/leads', data);
    return response.data;
  },

  /**
   * Update lead
   */
  updateLead: async (id: string, data: UpdateLeadDto): Promise<LeadResponse> => {
    const response = await axiosInstance.patch<LeadResponse>(`/leads/${id}`, data);
    return response.data;
  },

  /**
   * Delete lead
   */
  deleteLead: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/leads/${id}`);
    return response.data;
  },

  /**
   * Import leads in bulk
   */
  importLeads: async (data: ImportLeadsDto): Promise<ImportLeadsResponse> => {
    const response = await axiosInstance.post<ImportLeadsResponse>('/leads/import', data);
    return response.data;
  },

  /**
   * Export leads as CSV
   */
  exportLeads: async (query?: GetLeadsQuery): Promise<Blob> => {
    // Format query parameters - handle status array properly (same as getAllLeads)
    const params: any = { ...query };
    
    // Ensure status is properly formatted for the API
    if (params.status) {
      if (Array.isArray(params.status) && params.status.length > 0) {
        // Normalize status values (handle variations like "new" vs "new lead")
        const normalizedStatuses = params.status.map((s: string) => {
          const normalized = s.toLowerCase().trim();
          // Map variations to standard values
          if (normalized === 'new lead') return 'new';
          return normalized;
        });
        params.status = normalizedStatuses;
      } else if (typeof params.status === 'string' && params.status.trim() !== '') {
        // Normalize single status value
        const normalized = params.status.toLowerCase().trim();
        params.status = normalized === 'new lead' ? 'new' : normalized;
      } else {
        // Remove empty or invalid status
        delete params.status;
      }
    }
    
    const response = await axiosInstance.get('/leads/export', {
      params: params,
      paramsSerializer: {
        indexes: null, // Serialize arrays as status=value1&status=value2 (not status[]=value1)
      },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Download CSV file helper
   */
  downloadCsv: async (query?: GetLeadsQuery): Promise<void> => {
    const blob = await leadsService.exportLeads(query);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Send follow-up reminder email for a lead
   */
  sendFollowUpReminder: async (leadId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      `/leads/${leadId}/send-followup-reminder`
    );
    return response.data;
  },

  /**
   * Get list of cities from leads
   */
  getCities: async (): Promise<string[]> => {
    const response = await axiosInstance.get<{ cities: string[] }>('/leads/cities');
    return response.data.cities;
  },

  /**
   * Get all available sectors (default + custom)
   */
  getSectors: async (): Promise<string[]> => {
    const response = await axiosInstance.get<{ sectors: string[] }>('/leads/sectors');
    return response.data.sectors;
  },

  /**
   * Add a custom sector
   */
  addCustomSector: async (sectorName: string): Promise<{ message: string; sector: string }> => {
    const response = await axiosInstance.post<{ message: string; sector: string }>('/leads/sectors', {
      sector: sectorName,
    });
    return response.data;
  },
};

export default leadsService;

