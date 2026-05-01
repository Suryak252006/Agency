// ============================================================
// RBAC Type Definitions
// ============================================================

import { SystemRole, PermissionScope, CustomFeatureType, AccessScope, FeatureStatus } from '@prisma/client';

// ============================================================
// ROLES
// ============================================================

export interface IRole {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  systemRole?: SystemRole; // NULL for custom roles
  scope: PermissionScope;
  status: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  userCount?: number;
  permissionCount?: number;
}

export interface RoleFormData {
  name: string;
  description?: string;
  scope: PermissionScope;
  status: boolean;
  cloneFromRoleId?: string;
}

export interface RoleWithPermissions extends IRole {
  permissions: IPermission[];
}

// ============================================================
// PERMISSIONS
// ============================================================

export interface IPermission {
  id: string;
  key: string; // e.g., "users.view", "exams.publish"
  module: string; // e.g., "users", "exams", "reports"
  action: string; // e.g., "view", "create", "edit", "delete"
  description?: string;
  createdAt: Date;
}

export interface PermissionMatrix {
  [module: string]: {
    module: string;
    permissions: IPermission[];
  };
}

// ============================================================
// USER ROLES ASSIGNMENT
// ============================================================

export interface IUserRole {
  userId: string;
  roleId: string;
  schoolId: string;
  role: IRole;
  user: {
    id: string;
    email: string;
    name: string;
  };
  assignedBy: string;
  assignedAt: Date;
  createdAt: Date;
}

// ============================================================
// CUSTOM FEATURES
// ============================================================

export interface ICustomFeature {
  id: string;
  schoolId: string;
  name: string;
  key: string; // e.g., "attendance.correction"
  module: string;
  description?: string;
  type: CustomFeatureType;
  scope: AccessScope;
  status: FeatureStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  assignmentCount?: number;
}

export interface CustomFeatureFormData {
  name: string;
  key: string;
  module: string;
  description?: string;
  type: CustomFeatureType;
  scope: AccessScope;
  status: FeatureStatus;
}

// ============================================================
// CUSTOM FEATURE ASSIGNMENTS
// ============================================================

export interface ICustomFeatureAssignment {
  id: string;
  schoolId: string;
  featureId: string;
  roleId?: string; // NULL if assigned to user
  userId?: string; // NULL if assigned to role
  departmentId?: string;
  startDate: Date;
  expiryDate?: Date;
  requiresAcceptance: boolean;
  acceptedAt?: Date;
  acceptedBy?: string;
  declinedAt?: Date;
  declinedBy?: string;
  declineReason?: string;
  assignedBy: string;
  createdAt: Date;
  updatedAt: Date;
  feature?: ICustomFeature;
  role?: IRole;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  isExpired?: boolean;
  isActive?: boolean;
  daysUntilExpiry?: number;
  status: 'active' | 'pending_acceptance' | 'declined' | 'expired';
}

export interface CustomFeatureAssignmentFormData {
  featureId: string;
  assignTo: 'role' | 'user';
  roleId?: string;
  userId?: string;
  departmentId?: string;
  startDate: Date;
  expiryDate?: Date;
  requiresAcceptance: boolean;
}

// ============================================================
// RBAC LOGS
// ============================================================

export interface IRBACLog {
  id: string;
  schoolId: string;
  actorId: string;
  action: string; // "ROLE_CREATED", "PERMISSION_ASSIGNED", etc
  targetType: string; // "role", "permission", "custom_feature", "user_role", "assignment"
  targetId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  actor?: {
    id: string;
    email: string;
    name: string;
  };
}

// ============================================================
// PERMISSION CHECK CONTEXT
// ============================================================

export interface IUserWithPermissions {
  id: string;
  email: string;
  name: string;
  schoolId: string;
  roles: IRole[];
  permissions: string[]; // Permission keys
  customFeatures: ICustomFeatureAssignment[];
  hasPermission: (permission: string) => boolean;
  hasFeature: (featureKey: string) => boolean;
  hasRole: (roleId: string) => boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  by?: 'role' | 'custom_feature';
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface RBACApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
