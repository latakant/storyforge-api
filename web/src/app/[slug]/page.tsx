'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { articlesService } from '@/services/articles.service';
import { ClapButton } from '@/components/ui/clap-button';
import { CommentSection } from '@/components/ui/comment-section';

interface Props { params: Promise<{ slug: string }> }

export default function ArticlePage({ params }: Props) {
  const { slug } = use(params);

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => articlesService.getBySlug(slug),
  });

  if (isLoading) return <div className="text-gray-400 text-sm py-12 text-center">Loading...</div>;
  if (isError || !article) return <div className="text-red-500 text-sm py-12 text-center">Article not found.</div>;

  return (
    <article className="max-w-2xl mx-auto">
      {article.coverImageUrl && (
        <img src={article.coverImageUrl} alt={article.title} className="w-full h-64 object-cover rounded-xl mb-8" />
      )}

      <h1 className="text-3xl font-bold leading-tight mb-3">{article.title}</h1>

      <div className="flex items-center gap-3 text-sm text-gray-500 mb-8">
        <span>{article.author.name}</span>
        <span>·</span>
        {article.publishedAt && (
          <span>{new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        )}
      </div>

      {article.tags.length > 0 && (
        <div className="flex gap-2 mb-8">
          {article.tags.map((t) => (
            <span key={t.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              #{t.name}
            </span>
          ))}
        </div>
      )}

      <div className="prose prose-gray max-w-none mb-10 whitespace-pre-wrap text-gray-800 leading-relaxed">
        {article.latestContent}
      </div>

      <div className="border-t border-gray-100 pt-6 mb-8">
        <ClapButton articleId={article.id} initialCount={article.clapCount} />
      </div>

      <CommentSection articleId={article.id} />
    </article>
  );
}
