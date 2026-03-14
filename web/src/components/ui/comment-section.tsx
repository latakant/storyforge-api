'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commentsService } from '@/services/comments.service';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Comment } from '@/types';

interface Props { articleId: string; }

export function CommentSection({ articleId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState('');

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', articleId],
    queryFn: () => commentsService.list(articleId),
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => commentsService.create(articleId, { body }),
    onSuccess: () => {
      setBody('');
      toast.success('Comment submitted — pending approval');
      qc.invalidateQueries({ queryKey: ['comments', articleId] });
    },
    onError: () => toast.error('Failed to post comment'),
  });

  return (
    <section className="mt-12">
      <h3 className="text-lg font-semibold mb-6">
        Comments{comments.length > 0 && <span className="text-muted-foreground font-normal text-sm ml-2">({comments.length})</span>}
      </h3>

      {user ? (
        <div className="mb-8 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
          />
          <Button
            size="sm"
            onClick={() => body.trim() && submit()}
            disabled={isPending || !body.trim()}
          >
            {isPending ? 'Posting...' : 'Post comment'}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-6">
          <a href="/login" className="underline">Sign in</a> to leave a comment.
        </p>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="border rounded-lg p-4">
            <p className="text-sm text-gray-800">{c.body}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(c.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No approved comments yet.</p>
        )}
      </div>
    </section>
  );
}
