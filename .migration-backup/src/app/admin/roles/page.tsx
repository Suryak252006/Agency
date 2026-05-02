// ============================================================
// RBAC Admin: Roles Management Page
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Edit2, Copy, Eye, Trash2, Search } from 'lucide-react';
import { IRole } from '@/types/rbac';
import RoleFormModal from './role-form-modal';
import { toast } from 'sonner';

export default function RolesPage() {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: '10',
          search: search,
        });

        const res = await fetch(`/api/rbac/roles?${params}`);
        if (!res.ok) throw new Error('Failed to fetch roles');

        const data = await res.json();
        setRoles(data.items);
        setTotalPages(data.totalPages);
      } catch (error) {
        toast.error('Failed to fetch roles');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchRoles, 300);
    return () => clearTimeout(debounce);
  }, [search, page]);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsFormOpen(true);
  };

  const handleEditRole = (role: IRole) => {
    setSelectedRole(role);
    setIsFormOpen(true);
  };

  const handleCloneRole = async (role: IRole) => {
    try {
      setIsCloning(true);
      setSelectedRole({ ...role, id: '', name: `${role.name} (Copy)` });
      setIsFormOpen(true);
    } catch (error) {
      toast.error('Failed to clone role');
    } finally {
      setIsCloning(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/rbac/roles/${roleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete role');

      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      toast.success('Role deleted successfully');
    } catch (error) {
      toast.error('Failed to delete role');
      console.error(error);
    }
  };

  const handleRoleSaved = () => {
    setIsFormOpen(false);
    // Refresh roles list
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-gray-600">
            Manage system roles and define permissions for your organization
          </p>
        </div>
        <Button onClick={handleCreateRole} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Search Bar */}
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

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>Total: {roles.length} roles</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : roles.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No roles found</div>
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
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{role.userCount || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{role.permissionCount || 0}</Badge>
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
                            <DropdownMenuItem
                              onClick={() => handleEditRole(role)}
                              className="gap-2"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCloneRole(role)}
                              className="gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteRole(role.id)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
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

      {/* Role Form Modal */}
      <RoleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleRoleSaved}
        role={selectedRole}
        isCloning={isCloning}
      />
    </div>
  );
}
