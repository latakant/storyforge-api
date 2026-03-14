'use client';

import { useState } from 'react';
import { clapsService } from '@/services/claps.service';
import { useAuth } from '@/hooks/use-auth';

interface Props {
  articleId: string;
  initialCount: number;
}

export function ClapButton({ articleId, initialCount }: Props) {
  const { user } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function handleClap() {
    if (!user || loading) return;
    setLoading(true);
    try {
      const result = await clapsService.clap(articleId);
      setCount(result.clapCount);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClap}
      disabled={!user || loading}
      className="flex items-center gap-2 text-sm text-gray-500 hover:text-black disabled:opacity-40 transition-colors"
      title={user ? 'Clap for this article' : 'Sign in to clap'}
    >
      <span className="text-xl">👏</span>
      <span>{count}</span>
    </button>
  );
}
