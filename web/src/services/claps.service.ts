import { apiClient } from '@/lib/api-client';

interface ClapResult { articleId: string; clapCount: number; }

export const clapsService = {
  async clap(articleId: string): Promise<ClapResult> {
    const res = await apiClient.post<ClapResult>(`/articles/${articleId}/claps`);
    return res.data;
  },

  async getCount(articleId: string): Promise<ClapResult> {
    const res = await apiClient.get<ClapResult>(`/articles/${articleId}/claps`);
    return res.data;
  },
};
