'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await authService.logout();
    setUser(null);
    router.push('/');
  }

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <nav className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          StoryForge
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {(user.role === 'WRITER' || user.role === 'EDITOR' || user.role === 'ADMIN') && (
                <Link href="/write" className="text-gray-600 hover:text-black">
                  Write
                </Link>
              )}
              {(user.role === 'EDITOR' || user.role === 'ADMIN') && (
                <Link href="/moderation" className="text-gray-600 hover:text-black">
                  Moderation
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link href="/admin" className="text-gray-600 hover:text-black font-medium">
                  Admin
                </Link>
              )}
              <Link href="/drafts" className="text-gray-600 hover:text-black">
                Drafts
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-black"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-black">
                Sign in
              </Link>
              <Link
                href="/register"
                className="bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
