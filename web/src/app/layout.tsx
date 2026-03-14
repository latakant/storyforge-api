import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/navbar';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'StoryForge',
  description: 'A place for stories worth reading.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="antialiased bg-white text-gray-900">
        <Providers>
          <Navbar />
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
