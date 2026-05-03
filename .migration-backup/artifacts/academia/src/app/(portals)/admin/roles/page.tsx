// ============================================================
// RBAC Admin: Roles Management Page
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MoreVertical, Edit2, Copy, Eye, Trash2, Search } from 'lucide-react';
import { IRole } from '@/types/rbac';
import RoleFormModal from './role-form-modal';
import { toast } from 'sonner';
import { useRoles, useDeleteRole, queryKeys } from '@/lib/client/hooks';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';

export default function RolesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: rolesData, isLoading } = useRoles(page, 10, debouncedSearch);
  const deleteRoleMutation = useDeleteRole();
  const queryClient = useQueryClient();

  const roleList: IRole[] = rolesData?.data?.items ?? [];
  const totalPages = rolesData?.data?.totalPages ?? 1;

  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsCloning(false);
    setIsFormOpen(true);
  };

  const handleEditRole = (role: IRole) => {
    setSelectedRole(role);
    setIsCloning(false);
    setIsFormOpen(true);
  };

  const handleCloneRole = (role: IRole) => {
    setSelectedRole({ ...role, id: '', name: `${role.name} (Copy)` });
    setIsCloning(true);
    setIsFormOpen(true);
  };

  const handleDeleteRole = () => {
    if (!deleteTargetId) return;
    deleteRoleMutation.mutate(
      { id: deleteTargetId },
      {
        onSuccess: () => toast.success('Role deleted successfully'),
        onSettled: () => setDeleteTargetId(null),
      },
    );
  };

  const handleRoleSaved = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    setIsFormOpen(false);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Manage system roles and define permissions for your organisation"
        descriptionClassName="text-slate-600"
      >
        <Button onClick={handleCreateRole} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>Total: {roleList.length} roles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : roleList.length === 0 ? (
            <EmptyState message="No roles found. Create the first role to get started." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Permissions</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleList.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {role.description || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{role.userCount ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{role.permissionCount ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={role.status ? 'default' : 'secondary'}>
                          {role.status ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {new Date(role.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRole(role)} className="gap-2">
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCloneRole(role)} className="gap-2">
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTargetId(role.id)}
                              className="gap-2 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <RoleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleRoleSaved}
        role={selectedRole}
        isCloning={isCloning}
      />

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the role and all its permission assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={deleteRoleMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
