'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { adminService } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminService.getStats(),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm py-12 text-center">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.users ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Articles</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.articles.total ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Pending Comments</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.comments.pending ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Claps</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.claps ?? 0}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Card className="bg-gray-50">
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase">Articles by status</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Published</span><Badge variant="outline">{stats?.articles.published}</Badge></div>
            <div className="flex justify-between"><span>Submitted</span><Badge variant="secondary">{stats?.articles.submitted}</Badge></div>
            <div className="flex justify-between"><span>Draft</span><Badge variant="secondary">{stats?.articles.draft}</Badge></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Manage Users', href: '/admin/users', desc: 'Change roles, deactivate accounts' },
          { label: 'Pending Comments', href: '/admin/comments', desc: 'Approve or reject comments' },
          { label: 'All Articles', href: '/admin/articles', desc: 'View and moderate all content' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-black transition-colors cursor-pointer h-full">
              <CardHeader><CardTitle className="text-base">{item.label}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
