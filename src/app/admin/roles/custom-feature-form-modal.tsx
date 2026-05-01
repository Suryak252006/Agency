// ============================================================
// Custom Feature Form Modal
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
import { Label } from '@/components/ui/label';
import { CustomFeatureType, AccessScope, FeatureStatus } from '@prisma/client';
import { ICustomFeature } from '@/types/rbac';
import { toast } from 'sonner';

interface CustomFeatureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  feature?: ICustomFeature | null;
}

const FEATURE_TYPES: { value: CustomFeatureType; label: string }[] = [
  { value: 'MENU_PAGE', label: 'Menu Item / Page' },
  { value: 'BUTTON_ACTION', label: 'Button / Action' },
  { value: 'REPORT', label: 'Report' },
  { value: 'API_ACCESS', label: 'API Access' },
  { value: 'HIDDEN_TOOL', label: 'Hidden Internal Tool' },
];

const MODULES = [
  'Users',
  'Teachers',
  'Students',
  'Exams',
  'Results',
  'Reports',
  'Finance',
  'Inventory',
  'Custom',
];

export default function CustomFeatureFormModal({
  isOpen,
  onClose,
  onSaved,
  feature,
}: CustomFeatureFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    module: '',
    description: '',
    type: 'HIDDEN_TOOL' as CustomFeatureType,
    scope: 'GLOBAL' as AccessScope,
    status: 'ACTIVE' as FeatureStatus,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (feature) {
        setFormData({
          name: feature.name,
          key: feature.key,
          module: feature.module,
          description: feature.description || '',
          type: feature.type,
          scope: feature.scope,
          status: feature.status,
        });
      } else {
        setFormData({
          name: '',
          key: '',
          module: '',
          description: '',
          type: 'HIDDEN_TOOL',
          scope: 'GLOBAL',
          status: 'ACTIVE',
        });
      }
    }
  }, [isOpen, feature]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate key from name
    if (name === 'name' && !feature) {
      const autoKey = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '.');
      setFormData((prev) => ({ ...prev, key: autoKey }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.key.trim() || !formData.module) {
      toast.error('Fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const method = feature ? 'PUT' : 'POST';
      const url = feature ? `/api/rbac/custom-features/${feature.id}` : '/api/rbac/custom-features';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save feature');
      }

      toast.success(feature ? 'Feature updated' : 'Feature created');
      onSaved();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save feature');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      key: '',
      module: '',
      description: '',
      type: 'HIDDEN_TOOL',
      scope: 'GLOBAL',
      status: 'ACTIVE',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{feature ? 'Edit Feature' : 'Create Custom Feature'}</DialogTitle>
          <DialogDescription>
            {feature
              ? 'Update custom feature details'
              : 'Create a new custom feature for controlled access'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Feature Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Attendance Correction"
              required
            />
          </div>

          <div>
            <Label htmlFor="key">Feature Key *</Label>
            <Input
              id="key"
              name="key"
              value={formData.key}
              onChange={handleInputChange}
              placeholder="e.g., attendance.correction.access"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use dot notation for hierarchy (e.g., module.feature.action)
            </p>
          </div>

          <div>
            <Label htmlFor="module">Module *</Label>
            <Select value={formData.module} onValueChange={(value) =>
              setFormData(prev => ({ ...prev, module: value }))
            }>
              <SelectTrigger id="module">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="What does this feature do?"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Feature Type *</Label>
            <Select value={formData.type} onValueChange={(value: any) =>
              setFormData(prev => ({ ...prev, type: value }))
            }>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEATURE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="scope">Access Scope *</Label>
            <Select value={formData.scope} onValueChange={(value: any) =>
              setFormData(prev => ({ ...prev, scope: value }))
            }>
              <SelectTrigger id="scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">Global</SelectItem>
                <SelectItem value="DEPARTMENT">Department</SelectItem>
                <SelectItem value="USER_SPECIFIC">User Specific</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: any) =>
              setFormData(prev => ({ ...prev, status: value }))
            }>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : feature ? 'Update Feature' : 'Create Feature'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
