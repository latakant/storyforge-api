'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { articlesService } from '@/services/articles.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Props { params: Promise<{ id: string }> }

export default function EditArticlePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ['article-edit', id],
    queryFn: () => articlesService.getBySlug(id), // id used as slug fallback — service uses findUnique
  });

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.latestContent ?? '');
    }
  }, [article]);

  const { mutate: saveContent, isPending: saving } = useMutation({
    mutationFn: () => articlesService.saveContent(id, content),
    onSuccess: () => { toast.success('Saved'); setDirty(false); },
    onError: () => toast.error('Save failed'),
  });

  const { mutate: submit, isPending: submitting } = useMutation({
    mutationFn: () => articlesService.submit(id),
    onSuccess: () => { toast.success('Submitted for review'); router.push('/drafts'); },
    onError: () => toast.error('Submit failed'),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm py-12 text-center">Loading...</div>;
  if (!article) return <div className="text-destructive text-sm py-12 text-center">Article not found.</div>;

  const isSubmittable = article.status === 'DRAFT' && content.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Badge variant={article.status === 'DRAFT' ? 'secondary' : 'outline'}>
          {article.status}
        </Badge>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveContent()}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {isSubmittable && (
            <Button size="sm" onClick={() => submit()} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for review'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Input
          value={title}
          readOnly
          className="text-xl font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 h-auto py-2 bg-transparent"
        />
        <Textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setDirty(true); }}
          rows={24}
          className="border-0 resize-none focus-visible:ring-0 px-0 text-base leading-relaxed"
        />
      </div>
    </div>
  );
}
