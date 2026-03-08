import axiosInstance from './axios.config';
import {
    FollowupTemplate,
    CreateTemplateDto,
    UpdateTemplateDto,
} from './types';

export const templatesService = {
    /**
     * Get all email templates
     */
    getAllTemplates: async (): Promise<FollowupTemplate[]> => {
        const response = await axiosInstance.get<FollowupTemplate[]>('/templates');
        return response.data;
    },

    /**
     * Get template by ID
     */
    getTemplateById: async (id: string): Promise<FollowupTemplate> => {
        const response = await axiosInstance.get<FollowupTemplate>(`/templates/${id}`);
        return response.data;
    },

    /**
     * Create new template
     */
    createTemplate: async (data: CreateTemplateDto): Promise<FollowupTemplate> => {
        const response = await axiosInstance.post<FollowupTemplate>('/templates', data);
        return response.data;
    },

    /**
     * Update template
     */
    updateTemplate: async (id: string, data: UpdateTemplateDto): Promise<FollowupTemplate> => {
        const response = await axiosInstance.patch<FollowupTemplate>(`/templates/${id}`, data);
        return response.data;
    },

    /**
     * Delete template
     */
    deleteTemplate: async (id: string): Promise<{ message: string }> => {
        const response = await axiosInstance.delete<{ message: string }>(`/templates/${id}`);
        return response.data;
    },

    /**
     * Filter templates by type and sector
     */
    filterTemplates: async (type: string, sector: string): Promise<FollowupTemplate[]> => {
        const response = await axiosInstance.get<FollowupTemplate[]>('/templates/filter', {
            params: { type, sector },
        });
        return response.data;
    },
};

export default templatesService;
