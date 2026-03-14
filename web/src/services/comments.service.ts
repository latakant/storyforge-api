import { apiClient } from '@/lib/api-client';
import type { Comment } from '@/types';

export const commentsService = {
  async list(articleId: string): Promise<Comment[]> {
    const res = await apiClient.get<Comment[]>(`/articles/${articleId}/comments`);
    return res.data;
  },

  async create(articleId: string, data: { body: string; parentId?: string }): Promise<Comment> {
    const res = await apiClient.post<Comment>(`/articles/${articleId}/comments`, data);
    return res.data;
  },

  async remove(articleId: string, commentId: string): Promise<void> {
    await apiClient.delete(`/articles/${articleId}/comments/${commentId}`);
  },

  // Editor+ only
  async approve(articleId: string, commentId: string): Promise<Comment> {
    const res = await apiClient.post<Comment>(`/articles/${articleId}/comments/${commentId}/approve`);
    return res.data;
  },

  async reject(articleId: string, commentId: string): Promise<Comment> {
    const res = await apiClient.post<Comment>(`/articles/${articleId}/comments/${commentId}/reject`);
    return res.data;
  },
};
