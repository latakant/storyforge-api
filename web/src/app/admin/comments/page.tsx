'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { commentsService } from '@/services/comments.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PendingComment } from '@/services/admin.service';

export default function AdminCommentsPage() {
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['admin-pending-comments'],
    queryFn: () => adminService.getPendingComments(),
  });

  const { mutate: approve } = useMutation({
    mutationFn: ({ articleId, id }: { articleId: string; id: string }) =>
      commentsService.approve(articleId, id),
    onSuccess: () => { toast.success('Comment approved'); qc.invalidateQueries({ queryKey: ['admin-pending-comments'] }); },
    onError: () => toast.error('Failed to approve'),
  });

  const { mutate: reject } = useMutation({
    mutationFn: ({ articleId, id }: { articleId: string; id: string }) =>
      commentsService.reject(articleId, id),
    onSuccess: () => { toast.success('Comment rejected'); qc.invalidateQueries({ queryKey: ['admin-pending-comments'] }); },
    onError: () => toast.error('Failed to reject'),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm py-12 text-center">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold">Pending Comments</h1>
        <Badge variant="secondary">{comments.length}</Badge>
      </div>

      {comments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No pending comments.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c: PendingComment) => (
            <Card key={c.id}>
              <CardContent className="py-4">
                <p className="text-sm mb-2">{c.body}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    by <span className="font-medium">{c.author.name}</span> on{' '}
                    <Link href={`/${c.article.slug}`} className="underline hover:text-black">
                      {c.article.title}
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve({ articleId: c.article.id, id: c.id })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reject({ articleId: c.article.id, id: c.id })}>
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
