'use client';

import { useQuery } from '@tanstack/react-query';
import { articlesService } from '@/services/articles.service';
import { ArticleCard } from '@/components/ui/article-card';
import type { Article } from '@/types';

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.list({ limit: 20 }),
  });

  if (isLoading) {
    return <div className="text-gray-400 text-sm py-12 text-center">Loading stories...</div>;
  }

  const articles = data?.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Latest Stories</h1>
      {articles.length === 0 ? (
        <p className="text-gray-400 text-sm">No stories published yet.</p>
      ) : (
        <div>
          {articles.map((article: Article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
