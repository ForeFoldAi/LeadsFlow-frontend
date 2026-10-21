import axiosInstance from './axios.config';
import { UploadedMedia } from './types';

export const mediaService = {
    /**
     * Upload an image, document or video to S3 for use in emails
     */
    upload: async (file: File, onProgress?: (percent: number) => void): Promise<UploadedMedia> => {
        const form = new FormData();
        form.append('file', file);
        const response = await axiosInstance.post<UploadedMedia>('/media/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 10 * 60 * 1000,
            onUploadProgress: (e) => {
                if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
            },
        });
        return response.data;
    },
};

export default mediaService;
