'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { articlesService } from '@/services/articles.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => articlesService.create({ title, content }),
    onSuccess: (article) => {
      toast.success('Draft saved');
      router.push(`/write/${article.id}`);
    },
    onError: () => toast.error('Failed to save. Try again.'),
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">New story</h1>
      <div className="space-y-4">
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-black h-auto py-2"
        />
        <Textarea
          placeholder="Tell your story..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="border-0 resize-none focus-visible:ring-0 px-0 text-base leading-relaxed"
        />
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => create()}
            disabled={isPending || !title.trim() || !content.trim()}
          >
            {isPending ? 'Saving...' : 'Save draft'}
          </Button>
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
