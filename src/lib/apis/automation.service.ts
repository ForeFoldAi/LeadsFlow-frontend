import axiosInstance from './axios.config';
import {
    AutomationSchedule,
    CreateScheduleDto,
    UpdateScheduleDto,
} from './types';

export const automationService = {
    /**
     * Get all automation schedules
     */
    getAllSchedules: async (): Promise<AutomationSchedule[]> => {
        const response = await axiosInstance.get<AutomationSchedule[]>('/automation/schedules');
        return response.data;
    },

    /**
     * Get schedule by ID
     */
    getScheduleById: async (id: string): Promise<AutomationSchedule> => {
        const response = await axiosInstance.get<AutomationSchedule>(`/automation/schedules/${id}`);
        return response.data;
    },

    /**
     * Create new schedule
     */
    createSchedule: async (data: CreateScheduleDto): Promise<AutomationSchedule> => {
        const response = await axiosInstance.post<AutomationSchedule>('/automation/schedules', data);
        return response.data;
    },

    /**
     * Update schedule
     */
    updateSchedule: async (id: string, data: UpdateScheduleDto): Promise<AutomationSchedule> => {
        const response = await axiosInstance.patch<AutomationSchedule>(`/automation/schedules/${id}`, data);
        return response.data;
    },

    /**
     * Delete schedule
     */
    deleteSchedule: async (id: string): Promise<{ message: string }> => {
        const response = await axiosInstance.delete<{ message: string }>(`/automation/schedules/${id}`);
        return response.data;
    },

    /**
     * Run schedule immediately
     */
    runSchedule: async (id: string): Promise<{ processed: number; failed: number }> => {
        const response = await axiosInstance.post<{ processed: number; failed: number }>(`/automation/schedules/${id}/run`);
        return response.data;
    },
};

export default automationService;
