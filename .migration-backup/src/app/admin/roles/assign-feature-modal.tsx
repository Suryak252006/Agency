// ============================================================
// Assign Custom Feature Modal
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ICustomFeature } from '@/types/rbac';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface AssignFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  feature?: ICustomFeature | null;
}

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export default function AssignFeatureModal({
  isOpen,
  onClose,
  onSaved,
  feature,
}: AssignFeatureModalProps) {
  const [assignTo, setAssignTo] = useState<'role' | 'user'>('role');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [requiresAcceptance, setRequiresAcceptance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openRolePopover, setOpenRolePopover] = useState(false);
  const [openUserPopover, setOpenUserPopover] = useState(false);

  // Fetch roles and users on mount
  useEffect(() => {
    if (isOpen) {
      fetchRolesAndUsers();
      resetForm();
    }
  }, [isOpen]);

  const fetchRolesAndUsers = async () => {
    try {
      // Fetch roles
      const rolesRes = await fetch('/api/rbac/roles?pageSize=100');
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.items);
      }

      // Fetch users
      const usersRes = await fetch('/api/users?pageSize=100');
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch roles/users:', error);
      toast.error('Failed to load data');
    }
  };

  const resetForm = () => {
    setAssignTo('role');
    setSelectedRole('');
    setSelectedUser('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setExpiryDate('');
    setRequiresAcceptance(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feature) return;

    if (assignTo === 'role' && !selectedRole) {
      toast.error('Please select a role');
      return;
    }

    if (assignTo === 'user' && !selectedUser) {
      toast.error('Please select a user');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        featureId: feature.id,
        roleId: assignTo === 'role' ? selectedRole : undefined,
        userId: assignTo === 'user' ? selectedUser : undefined,
        startDate: new Date(startDate),
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        requiresAcceptance,
      };

      const res = await fetch('/api/rbac/custom-features/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign feature');
      }

      toast.success('Feature assigned successfully');
      onSaved();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign feature');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getRoleLabel = () => {
    return roles.find((r) => r.id === selectedRole)?.name || 'Select role...';
  };

  const getUserLabel = () => {
    return users.find((u) => u.id === selectedUser)?.name || 'Select user...';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Feature Access</DialogTitle>
          <DialogDescription>
            Grant access to "{feature?.name}" for specific users or roles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assign To */}
          <div className="space-y-2">
            <Label>Assign To</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignTo"
                  value="role"
                  checked={assignTo === 'role'}
                  onChange={(e) => setAssignTo(e.target.value as 'role' | 'user')}
                  className="cursor-pointer"
                />
                <span className="text-sm">Role</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignTo"
                  value="user"
                  checked={assignTo === 'user'}
                  onChange={(e) => setAssignTo(e.target.value as 'role' | 'user')}
                  className="cursor-pointer"
                />
                <span className="text-sm">User</span>
              </label>
            </div>
          </div>

          {/* Role Select */}
          {assignTo === 'role' && (
            <div className="space-y-2">
              <Label>Select Role</Label>
              <Popover open={openRolePopover} onOpenChange={setOpenRolePopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openRolePopover}
                    className="w-full justify-between"
                  >
                    {getRoleLabel()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search roles..." />
                    <CommandEmpty>No role found.</CommandEmpty>
                    <CommandGroup>
                      {roles.map((role) => (
                        <CommandItem
                          key={role.id}
                          value={role.id}
                          onSelect={(currentValue) => {
                            setSelectedRole(currentValue === selectedRole ? '' : currentValue);
                            setOpenRolePopover(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedRole === role.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {role.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* User Select */}
          {assignTo === 'user' && (
            <div className="space-y-2">
              <Label>Select User</Label>
              <Popover open={openUserPopover} onOpenChange={setOpenUserPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openUserPopover}
                    className="w-full justify-between"
                  >
                    {getUserLabel()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={(currentValue) => {
                            setSelectedUser(currentValue === selectedUser ? '' : currentValue);
                            setOpenUserPopover(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedUser === user.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div>
                            <div>{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={startDate}
            />
            <p className="text-xs text-gray-500">Leave empty for permanent access</p>
          </div>

          {/* Requires Acceptance */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="requiresAcceptance"
              checked={requiresAcceptance}
              onCheckedChange={(checked) => setRequiresAcceptance(checked as boolean)}
            />
            <Label htmlFor="requiresAcceptance" className="text-sm cursor-pointer">
              Require user acceptance
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Access'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
