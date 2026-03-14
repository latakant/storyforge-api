import Link from 'next/link';
import type { Article } from '@/types';

interface Props {
  article: Article & { author?: { name: string }; tags?: { slug: string; name: string }[] };
}

export function ArticleCard({ article }: Props) {
  return (
    <article className="py-6 border-b border-gray-100 last:border-0">
      {article.author && (
        <p className="text-sm text-gray-500 mb-1">{article.author.name}</p>
      )}
      <Link href={`/${article.slug}`} className="group">
        <h2 className="text-xl font-semibold group-hover:underline underline-offset-2 mb-1">
          {article.title}
        </h2>
      </Link>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        {article.publishedAt && (
          <span>{new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        )}
        {article.tags?.map((t) => (
          <Link key={t.slug} href={`/tag/${t.slug}`} className="hover:text-black">
            #{t.name}
          </Link>
        ))}
      </div>
    </article>
  );
}
