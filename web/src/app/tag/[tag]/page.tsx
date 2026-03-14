'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { articlesService } from '@/services/articles.service';
import { ArticleCard } from '@/components/ui/article-card';
import { Badge } from '@/components/ui/badge';
import type { Article } from '@/types';

interface Props { params: Promise<{ tag: string }> }

export default function TagPage({ params }: Props) {
  const { tag } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['articles', 'tag', tag],
    queryFn: () => articlesService.list({ tag, limit: 30 }),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm py-12 text-center">Loading...</div>;

  const articles = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold">Stories tagged</h1>
        <Badge>#{tag}</Badge>
      </div>
      {articles.length === 0 ? (
        <p className="text-muted-foreground text-sm">No stories with this tag yet.</p>
      ) : (
        articles.map((a: Article) => <ArticleCard key={a.id} article={a} />)
      )}
    </div>
  );
}
