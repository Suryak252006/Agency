// ============================================================
// Custom Features Management Page
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MoreVertical, Edit2, Trash2, Search, Clock } from 'lucide-react';
import { ICustomFeature, ICustomFeatureAssignment } from '@/types/rbac';
import CustomFeatureFormModal from './custom-feature-form-modal';
import AssignFeatureModal from './assign-feature-modal';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';

export default function CustomFeaturesPage() {
  const [features, setFeatures] = useState<ICustomFeature[]>([]);
  const [assignments, setAssignments] = useState<ICustomFeatureAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('features');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<ICustomFeature | null>(null);
  const [deleteFeatureId, setDeleteFeatureId] = useState<string | null>(null);
  const [revokeAssignmentId, setRevokeAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'features') {
      const fetchFeatures = async () => {
        try {
          setLoading(true);
          const params = new URLSearchParams({ page: page.toString(), pageSize: '10', search });
          const res = await fetch(`/api/rbac/custom-features?${params}`);
          if (!res.ok) throw new Error('Failed to fetch features');
          const json = await res.json();
          setFeatures(json.data?.items ?? []);
          setTotalPages(json.data?.totalPages ?? 1);
        } catch {
          toast.error('Failed to fetch features');
        } finally {
          setLoading(false);
        }
      };

      const debounce = setTimeout(fetchFeatures, 300);
      return () => clearTimeout(debounce);
    }
  }, [search, page, activeTab]);

  useEffect(() => {
    if (activeTab === 'assignments') {
      const fetchAssignments = async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/rbac/custom-features/assignments');
          if (!res.ok) throw new Error('Failed to fetch assignments');
          const json = await res.json();
          setAssignments(json.data ?? json);
        } catch {
          toast.error('Failed to fetch assignments');
        } finally {
          setLoading(false);
        }
      };

      const debounce = setTimeout(fetchAssignments, 300);
      return () => clearTimeout(debounce);
    }
  }, [activeTab]);

  const handleDeleteFeature = async () => {
    if (!deleteFeatureId) return;
    try {
      const res = await fetch(`/api/rbac/custom-features/${deleteFeatureId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete feature');
      setFeatures((prev) => prev.filter((f) => f.id !== deleteFeatureId));
      toast.success('Feature deleted successfully');
    } catch {
      toast.error('Failed to delete feature');
    } finally {
      setDeleteFeatureId(null);
    }
  };

  const handleRevokeAssignment = async () => {
    if (!revokeAssignmentId) return;
    try {
      const res = await fetch(`/api/rbac/custom-features/assignments/${revokeAssignmentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke');
      setAssignments((prev) => prev.filter((a) => a.id !== revokeAssignmentId));
      toast.success('Assignment revoked');
    } catch {
      toast.error('Failed to revoke assignment');
    } finally {
      setRevokeAssignmentId(null);
    }
  };

  const getStatusBadge = (assignment: ICustomFeatureAssignment) => {
    if (assignment.declinedAt) return <Badge variant="destructive">Declined</Badge>;
    if (assignment.expiryDate && new Date(assignment.expiryDate) < new Date())
      return <Badge variant="secondary">Expired</Badge>;
    if (assignment.requiresAcceptance && !assignment.acceptedAt)
      return <Badge variant="outline">Pending</Badge>;
    return <Badge variant="default">Active</Badge>;
  };

  const getDaysUntilExpiry = (expiryDate?: string | Date) => {
    if (!expiryDate) return null;
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Custom Features</h1>
          <p className="text-slate-600">Create and manage custom feature access for users and roles</p>
        </div>
        <Button onClick={() => { setSelectedFeature(null); setIsFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Feature
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="features">Custom Features</TabsTrigger>
          <TabsTrigger value="assignments">Access Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search features..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Features</CardTitle>
              <CardDescription>Total: {features.length} features</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : features.length === 0 ? (
                <EmptyState message="No custom features found. Create the first one to get started." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature Name</TableHead>
                        <TableHead>Feature Key</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Assignments</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {features.map((feature) => (
                        <TableRow key={feature.id}>
                          <TableCell className="font-medium">{feature.name}</TableCell>
                          <TableCell className="text-sm font-mono">{feature.key}</TableCell>
                          <TableCell>{feature.module}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{feature.type}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge>{feature.assignmentCount ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={feature.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {feature.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedFeature(feature); setIsFormOpen(true); }}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedFeature(feature); setIsAssignOpen(true); }}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Assign Access
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteFeatureId(feature.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
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
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Assignments</CardTitle>
              <CardDescription>View and manage feature access assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : assignments.length === 0 ? (
                <EmptyState message="No assignments yet. Assign a feature from the Custom Features tab." />
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{assignment.feature?.name}</p>
                        <p className="text-sm text-gray-600">
                          {assignment.user
                            ? `User: ${assignment.user.name}`
                            : `Role: ${assignment.role?.name}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {assignment.expiryDate && getDaysUntilExpiry(assignment.expiryDate) !== null && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{getDaysUntilExpiry(assignment.expiryDate)} days left</span>
                          </div>
                        )}
                        {getStatusBadge(assignment)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setRevokeAssignmentId(assignment.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Revoke
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomFeatureFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => { setIsFormOpen(false); setPage(1); }}
        feature={selectedFeature}
      />

      <AssignFeatureModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onSaved={() => { setIsAssignOpen(false); setActiveTab('assignments'); }}
        feature={selectedFeature}
      />

      <AlertDialog open={!!deleteFeatureId} onOpenChange={(open) => !open && setDeleteFeatureId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feature?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the feature and all its access assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFeature}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!revokeAssignmentId} onOpenChange={(open) => !open && setRevokeAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke this feature assignment. The user or role will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAssignment}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
