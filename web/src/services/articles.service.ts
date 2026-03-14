import { apiClient } from '@/lib/api-client';
import type { Article, ArticleDetail, Paginated, Revision } from '@/types';

export interface ListParams {
  page?: number;
  limit?: number;
  tag?: string;
  author?: string;
}

export const articlesService = {
  async list(params?: ListParams): Promise<Paginated<Article>> {
    const res = await apiClient.get<Paginated<Article>>('/articles', { params });
    return res.data;
  },

  async getBySlug(slug: string): Promise<ArticleDetail> {
    const res = await apiClient.get<ArticleDetail>(`/articles/${slug}`);
    return res.data;
  },

  async create(data: { title: string; content: string; coverImageUrl?: string }): Promise<Article> {
    const res = await apiClient.post<Article>('/articles', data);
    return res.data;
  },

  async update(id: string, data: { title?: string; coverImageUrl?: string; tagIds?: string[] }): Promise<Article> {
    const res = await apiClient.patch<Article>(`/articles/${id}`, data);
    return res.data;
  },

  async saveContent(id: string, content: string): Promise<Revision> {
    const res = await apiClient.patch<Revision>(`/articles/${id}/content`, { content });
    return res.data;
  },

  async submit(id: string): Promise<Article> {
    const res = await apiClient.post<Article>(`/articles/${id}/submit`);
    return res.data;
  },

  async publish(id: string): Promise<Article> {
    const res = await apiClient.post<Article>(`/articles/${id}/publish`);
    return res.data;
  },

  async reject(id: string, editorNote: string): Promise<Article> {
    const res = await apiClient.post<Article>(`/articles/${id}/reject`, { editorNote });
    return res.data;
  },

  async archive(id: string): Promise<Article> {
    const res = await apiClient.post<Article>(`/articles/${id}/archive`);
    return res.data;
  },

  async getRevisions(id: string): Promise<Revision[]> {
    const res = await apiClient.get<Revision[]>(`/articles/${id}/revisions`);
    return res.data;
  },
};
