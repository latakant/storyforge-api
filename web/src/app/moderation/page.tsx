'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { articlesService } from '@/services/articles.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Article } from '@/types';

export default function ModerationPage() {
  const qc = useQueryClient();
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['moderation'],
    queryFn: () => articlesService.list({ limit: 50 }),
  });

  const submitted = (data?.data ?? []).filter((a: Article) => a.status === 'SUBMITTED');

  const { mutate: publish } = useMutation({
    mutationFn: (id: string) => articlesService.publish(id),
    onSuccess: () => { toast.success('Article published'); qc.invalidateQueries({ queryKey: ['moderation'] }); },
    onError: () => toast.error('Failed to publish'),
  });

  const { mutate: reject } = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => articlesService.reject(id, note),
    onSuccess: () => { toast.success('Article rejected'); qc.invalidateQueries({ queryKey: ['moderation'] }); },
    onError: () => toast.error('Failed to reject'),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm py-12 text-center">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
        <Badge variant="secondary">{submitted.length}</Badge>
      </div>

      {submitted.length === 0 ? (
        <p className="text-muted-foreground text-sm">No articles awaiting review.</p>
      ) : (
        <div className="space-y-4">
          {submitted.map((article: Article) => (
            <Card key={article.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{article.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(article.updatedAt).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-start">
                  <Button size="sm" onClick={() => publish(article.id)}>
                    Publish
                  </Button>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Input
                      placeholder="Rejection note (required to reject)"
                      value={rejectNote[article.id] ?? ''}
                      onChange={(e) => setRejectNote({ ...rejectNote, [article.id]: e.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => reject({ id: article.id, note: rejectNote[article.id] ?? '' })}
                      disabled={!rejectNote[article.id]?.trim()}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
