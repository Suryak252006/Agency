// ============================================================
// Role Form Modal with Permission Matrix
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Search } from 'lucide-react';
import { IRole, IPermission } from '@/types/rbac';
import { buildPermissionMatrix } from '@/lib/rbac/utils';
import { ROLE_PERMISSION_MAP } from '@/lib/rbac/constants';
import { toast } from 'sonner';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  role?: IRole | null;
  isCloning?: boolean;
}

export default function RoleFormModal({
  isOpen,
  onClose,
  onSaved,
  role,
  isCloning,
}: RoleFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scope: 'SCHOOL' as const,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [permissionMatrix, setPermissionMatrix] = useState<any>({});

  // Initialize form and permissions
  useEffect(() => {
    if (isOpen) {
      // Build permission matrix
      setPermissionMatrix(buildPermissionMatrix());

      if (role && !isCloning) {
        setFormData({
          name: role.name,
          description: role.description || '',
          scope: role.scope as any,
        });
        // Load existing permissions
        loadRolePermissions(role.id);
      } else {
        setFormData({ name: '', description: '', scope: 'SCHOOL' });
        setSelectedPermissions([]);
      }
    }
  }, [isOpen, role, isCloning]);

  const loadRolePermissions = async (roleId: string) => {
    try {
      const res = await fetch(`/api/rbac/roles/${roleId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPermissions(data.permissions.map((p: any) => p.permissionId));
      }
    } catch (error) {
      console.error('Failed to load role permissions:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const togglePermission = (permissionKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionKey)
        ? prev.filter((p) => p !== permissionKey)
        : [...prev, permissionKey],
    );
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module],
    );
  };

  const selectAllInModule = (module: string, permissions: IPermission[]) => {
    const permissionKeys = permissions.map((p) => Object.values(p)[0]);
    const allSelected = permissionKeys.every((p) => selectedPermissions.includes(p as string));

    setSelectedPermissions((prev) => {
      if (allSelected) {
        return prev.filter((p) => !permissionKeys.includes(p as any));
      } else {
        return [...prev, ...permissionKeys.filter((p) => !prev.includes(p as string))];
      }
    });
  };

  const cloneFromSystemRole = (systemRole: string) => {
    const permissions = ROLE_PERMISSION_MAP[systemRole] || [];
    setSelectedPermissions(permissions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      setLoading(true);
      const method = role && !isCloning ? 'PUT' : 'POST';
      const url = role && !isCloning ? `/api/rbac/roles/${role.id}` : '/api/rbac/roles';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          permissionIds: selectedPermissions,
          cloneFromRoleId: isCloning && role ? role.id : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save role');
      }

      toast.success(role && !isCloning ? 'Role updated' : 'Role created');
      onSaved();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save role');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', scope: 'SCHOOL' });
    setSelectedPermissions([]);
    setExpandedModules([]);
    setPermissionSearch('');
    onClose();
  };

  const filteredModules = Object.entries(permissionMatrix)
    .filter(([module, data]: any) =>
      module.toLowerCase().includes(permissionSearch.toLowerCase()) ||
      data.permissions.some((p: any) =>
        p.description?.toLowerCase().includes(permissionSearch.toLowerCase()),
      ),
    )
    .reduce((acc: any, [module, data]) => {
      acc[module] = data;
      return acc;
    }, {});

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role && !isCloning ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          <DialogDescription>
            {role && !isCloning
              ? 'Update role details and permissions'
              : 'Create a new role or clone an existing one'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Academic Head"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose of this role..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="scope">Scope</Label>
              <Select value={formData.scope} onValueChange={(value: any) => 
                setFormData(prev => ({ ...prev, scope: value }))
              }>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">Global</SelectItem>
                  <SelectItem value="SCHOOL">School</SelectItem>
                  <SelectItem value="BRANCH">Branch</SelectItem>
                  <SelectItem value="DEPARTMENT">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Permissions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Clone from system role */}
              {!role || isCloning ? (
                <div className="flex gap-2 flex-wrap">
                  <p className="text-sm text-gray-600 w-full">Clone from system role:</p>
                  {Object.entries(ROLE_PERMISSION_MAP).map(([systemRole, _]) => (
                    <Button
                      key={systemRole}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cloneFromSystemRole(systemRole)}
                    >
                      {systemRole.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              ) : null}

              {/* Search permissions */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search permissions..."
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Permission Matrix */}
              <ScrollArea className="h-96 border rounded-lg p-4">
                <div className="space-y-3">
                  {Object.entries(filteredModules).map(([module, data]: any) => (
                    <div key={module} className="border rounded-lg p-3">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleModule(module)}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedModules.includes(module) ? 'rotate-180' : ''
                          }`}
                        />
                        <span className="font-semibold capitalize">{module}</span>
                        <span className="text-xs text-gray-500">
                          ({selectedPermissions.filter((p) =>
                            data.permissions.some((perm: any) =>
                              (Object.values(perm)[0] as any)?.includes(p),
                            ),
                          ).length}{' '}
                          / {data.permissions.length})
                        </span>
                      </div>

                      {expandedModules.includes(module) && (
                        <div className="ml-6 mt-3 space-y-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              selectAllInModule(module, data.permissions)
                            }
                          >
                            {selectedPermissions.some((p) =>
                              data.permissions.some((perm: any) =>
                                (Object.values(perm)[0] as any)?.includes(p),
                              ),
                            )
                              ? 'Deselect All'
                              : 'Select All'}
                          </Button>
                          <div className="space-y-2">
                            {data.permissions.map((perm: any, idx: number) => {
                              const permKey = Object.keys(perm)[0];
                              const permData = perm[permKey];
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <Checkbox
                                    id={permKey}
                                    checked={selectedPermissions.includes(permKey)}
                                    onCheckedChange={() => togglePermission(permKey)}
                                  />
                                  <Label htmlFor={permKey} className="text-sm cursor-pointer">
                                    {permData.action}
                                    {permData.description && (
                                      <span className="block text-xs text-gray-500">
                                        {permData.description}
                                      </span>
                                    )}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : role && !isCloning ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
