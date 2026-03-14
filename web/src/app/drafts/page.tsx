'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { articlesService } from '@/services/articles.service';
import type { Article } from '@/types';

export default function DraftsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['drafts'],
    queryFn: () => articlesService.list({ limit: 50 }),
  });

  const drafts = (data?.data ?? []).filter(
    (a: Article) => a.status === 'DRAFT' || a.status === 'SUBMITTED',
  );

  if (isLoading) return <div className="text-gray-400 text-sm py-12 text-center">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Drafts</h1>
        <Link href="/write" className="bg-black text-white text-sm px-4 py-2 rounded-lg">
          New story
        </Link>
      </div>

      {drafts.length === 0 ? (
        <p className="text-gray-400 text-sm">No drafts yet. <Link href="/write" className="underline">Start writing</Link>.</p>
      ) : (
        <div className="space-y-2">
          {drafts.map((article: Article) => (
            <div key={article.id} className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-sm">{article.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {article.status} · {new Date(article.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Link href={`/write/${article.id}`} className="text-xs text-gray-500 hover:text-black underline">
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
