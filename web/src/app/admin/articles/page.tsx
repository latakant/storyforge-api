'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { articlesService } from '@/services/articles.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Article } from '@/types';

const statusVariant = (s: string) =>
  s === 'PUBLISHED' ? 'default' :
  s === 'SUBMITTED' ? 'secondary' :
  s === 'ARCHIVED' ? 'outline' : 'outline';

export default function AdminArticlesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-articles'],
    queryFn: () => articlesService.list({ limit: 100 }),
  });

  const { mutate: archive } = useMutation({
    mutationFn: (id: string) => articlesService.archive(id),
    onSuccess: () => { toast.success('Article archived'); qc.invalidateQueries({ queryKey: ['admin-articles'] }); },
    onError: () => toast.error('Failed to archive'),
  });

  const articles = data?.data ?? [];

  if (isLoading) return <div className="text-muted-foreground text-sm py-12 text-center">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">
        All Articles <span className="text-muted-foreground font-normal text-base">({articles.length})</span>
      </h1>

      <div className="space-y-2">
        {articles.map((article: Article) => (
          <div key={article.id} className="flex items-center justify-between py-3 border-b border-gray-100 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/${article.slug}`} className="font-medium text-sm hover:underline truncate">
                  {article.title}
                </Link>
                <Badge variant={statusVariant(article.status)} className="text-xs shrink-0">
                  {article.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(article.updatedAt).toLocaleDateString()}
              </p>
            </div>
            {article.status !== 'ARCHIVED' && (
              <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={() => archive(article.id)}>
                Archive
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
