'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Role } from '@/types';
import type { AdminUser } from '@/services/admin.service';

const ROLES: Role[] = ['READER', 'WRITER', 'EDITOR', 'ADMIN'];

const roleBadgeVariant = (role: Role) =>
  role === 'ADMIN' ? 'destructive' :
  role === 'EDITOR' ? 'default' :
  role === 'WRITER' ? 'secondary' : 'outline';

export default function AdminUsersPage() {
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.listUsers(),
  });

  const { mutate: changeRole } = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => adminService.changeRole(id, role),
    onSuccess: (u) => { toast.success(`${u.name} is now ${u.role}`); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast.error('Failed to change role'),
  });

  const { mutate: toggle } = useMutation({
    mutationFn: (id: string) => adminService.toggleStatus(id),
    onSuccess: (u) => { toast.success(`${u.name} ${u.isActive ? 'activated' : 'deactivated'}`); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm py-12 text-center">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Users <span className="text-muted-foreground font-normal text-base">({users.length})</span></h1>

      <div className="space-y-3">
        {users.map((user: AdminUser) => (
          <Card key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <Badge variant={roleBadgeVariant(user.role)} className="text-xs">{user.role}</Badge>
                  {!user.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email} · {user._count.articles} articles · {user._count.comments} comments</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={user.role}
                  onChange={(e) => changeRole({ id: user.id, role: e.target.value as Role })}
                  className="text-xs border rounded px-2 py-1 focus:outline-none"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Button
                  size="sm"
                  variant={user.isActive ? 'destructive' : 'outline'}
                  onClick={() => toggle(user.id)}
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
