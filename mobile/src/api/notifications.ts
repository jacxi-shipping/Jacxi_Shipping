import client from './client';
import { Notification, NotificationListResponse } from '../types/api';

export const notificationsApi = {
  async getNotifications(): Promise<NotificationListResponse> {
    const response = await client.get<NotificationListResponse>('/api/notifications');
    return response.data;
  },

  async markAsRead(id: string): Promise<void> {
    await client.patch(`/api/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await client.post('/api/notifications/read-all');
  },

  async deleteNotification(id: string): Promise<void> {
    await client.delete(`/api/notifications/${id}`);
  },
};
