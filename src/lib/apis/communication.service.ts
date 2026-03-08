import axiosInstance from './axios.config';
import {
    CommunicationLog,
    SendMessageDto,
} from './types';

export const communicationService = {
    /**
     * Send a message (Email, SMS, WhatsApp)
     */
    sendMessage: async (data: SendMessageDto): Promise<CommunicationLog> => {
        const response = await axiosInstance.post<CommunicationLog>('/communication/send', data);
        return response.data;
    },

    /**
     * Get all communication logs
     */
    getAllLogs: async (): Promise<CommunicationLog[]> => {
        const response = await axiosInstance.get<CommunicationLog[]>('/communication/logs');
        return response.data;
    },

    /**
     * Get communication logs for a specific lead
     */
    getLeadLogs: async (leadId: string): Promise<CommunicationLog[]> => {
        const response = await axiosInstance.get<CommunicationLog[]>(`/communication/logs/${leadId}`);
        return response.data;
    },
};

export default communicationService;
