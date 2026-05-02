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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MoreVertical, Edit2, Copy, Trash2, Search, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ICustomFeature, ICustomFeatureAssignment } from '@/types/rbac';
import CustomFeatureFormModal from './custom-feature-form-modal';
import AssignFeatureModal from './assign-feature-modal';
import { toast } from 'sonner';

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

  // Fetch custom features
  useEffect(() => {
    if (activeTab === 'features') {
      const fetchFeatures = async () => {
        try {
          setLoading(true);
          const params = new URLSearchParams({
            page: page.toString(),
            pageSize: '10',
            search,
          });

          const res = await fetch(`/api/rbac/custom-features?${params}`);
          if (!res.ok) throw new Error('Failed to fetch features');

          const data = await res.json();
          setFeatures(data.items);
          setTotalPages(data.totalPages);
        } catch (error) {
          toast.error('Failed to fetch features');
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      const debounce = setTimeout(fetchFeatures, 300);
      return () => clearTimeout(debounce);
    }
  }, [search, page, activeTab]);

  // Fetch assignments
  useEffect(() => {
    if (activeTab === 'assignments') {
      const fetchAssignments = async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/rbac/custom-features/assignments');
          if (!res.ok) throw new Error('Failed to fetch assignments');

          const data = await res.json();
          setAssignments(data);
        } catch (error) {
          toast.error('Failed to fetch assignments');
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      const debounce = setTimeout(fetchAssignments, 300);
      return () => clearTimeout(debounce);
    }
  }, [activeTab]);

  const handleCreateFeature = () => {
    setSelectedFeature(null);
    setIsFormOpen(true);
  };

  const handleEditFeature = (feature: ICustomFeature) => {
    setSelectedFeature(feature);
    setIsFormOpen(true);
  };

  const handleAssignFeature = (feature: ICustomFeature) => {
    setSelectedFeature(feature);
    setIsAssignOpen(true);
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!confirm('Are you sure? This will also delete all assignments.')) return;

    try {
      const res = await fetch(`/api/rbac/custom-features/${featureId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete feature');

      setFeatures((prev) => prev.filter((f) => f.id !== featureId));
      toast.success('Feature deleted successfully');
    } catch (error) {
      toast.error('Failed to delete feature');
      console.error(error);
    }
  };

  const handleRevokeAssignment = async (assignmentId: string) => {
    if (!confirm('Revoke this access?')) return;

    try {
      const res = await fetch(`/api/rbac/custom-features/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke');

      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast.success('Assignment revoked');
    } catch (error) {
      toast.error('Failed to revoke assignment');
      console.error(error);
    }
  };

  const getStatusBadge = (assignment: ICustomFeatureAssignment) => {
    if (assignment.declinedAt) {
      return <Badge variant="destructive">Declined</Badge>;
    }
    if (assignment.expiryDate && new Date(assignment.expiryDate) < new Date()) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (assignment.requiresAcceptance && !assignment.acceptedAt) {
      return <Badge variant="outline">Pending</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getDaysUntilExpiry = (expiryDate?: string | Date) => {
    if (!expiryDate) return null;
    const days = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    return days > 0 ? days : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Features</h1>
          <p className="text-gray-600">
            Create and manage custom feature access for users and roles
          </p>
        </div>
        <Button onClick={handleCreateFeature} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Feature
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="features">Custom Features</TabsTrigger>
          <TabsTrigger value="assignments">Access Assignments</TabsTrigger>
        </TabsList>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search features..."
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

          {/* Features Table */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Features</CardTitle>
              <CardDescription>Total: {features.length} features</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : features.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No custom features found</div>
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
                            <Badge>{feature.assignmentCount || 0}</Badge>
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
                                <DropdownMenuItem onClick={() => handleEditFeature(feature)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAssignFeature(feature)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Assign Access
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteFeature(feature.id)}
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

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Assignments</CardTitle>
              <CardDescription>View and manage feature access assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No assignments yet</div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold">{assignment.feature?.name}</p>
                            <p className="text-sm text-gray-600">
                              {assignment.user
                                ? `User: ${assignment.user.name}`
                                : `Role: ${assignment.role?.name}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {assignment.expiryDate && getDaysUntilExpiry(assignment.expiryDate) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>
                              {getDaysUntilExpiry(assignment.expiryDate)} days left
                            </span>
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
                              onClick={() => handleRevokeAssignment(assignment.id)}
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

      {/* Modals */}
      <CustomFeatureFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => {
          setIsFormOpen(false);
          setPage(1);
        }}
        feature={selectedFeature}
      />

      <AssignFeatureModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onSaved={() => {
          setIsAssignOpen(false);
          setActiveTab('assignments');
        }}
        feature={selectedFeature}
      />
    </div>
  );
}
