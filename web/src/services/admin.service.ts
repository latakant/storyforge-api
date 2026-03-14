import { apiClient } from '@/lib/api-client';
import type { Role } from '@/types';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  _count: { articles: number; comments: number };
}

export interface AdminStats {
  users: number;
  articles: { total: number; published: number; submitted: number; draft: number };
  comments: { total: number; pending: number };
  claps: number;
}

export interface PendingComment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
  article: { id: string; title: string; slug: string };
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const res = await apiClient.get<AdminStats>('/admin/stats');
    return res.data;
  },

  async listUsers(): Promise<AdminUser[]> {
    const res = await apiClient.get<AdminUser[]>('/admin/users');
    return res.data;
  },

  async changeRole(userId: string, role: Role): Promise<AdminUser> {
    const res = await apiClient.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async toggleStatus(userId: string): Promise<AdminUser> {
    const res = await apiClient.patch<AdminUser>(`/admin/users/${userId}/toggle`);
    return res.data;
  },

  async getPendingComments(): Promise<PendingComment[]> {
    const res = await apiClient.get<PendingComment[]>('/admin/comments/pending');
    return res.data;
  },
};
