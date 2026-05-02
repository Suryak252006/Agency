// ============================================================
// RBAC Constants & Permissions
// ============================================================

import { SystemRole, PermissionScope } from '@prisma/client';

// ============================================================
// SYSTEM ROLES DEFINITIONS
// ============================================================

export const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Founder/Owner level access. Full system control.',
    systemRole: 'SUPER_ADMIN' as SystemRole,
    scope: 'GLOBAL' as PermissionScope,
    hidden: true,
    icon: 'Crown',
  },
  ADMIN: {
    name: 'Admin',
    description: 'School operations admin. Runs daily operations.',
    systemRole: 'ADMIN' as SystemRole,
    scope: 'SCHOOL' as PermissionScope,
    hidden: false,
    icon: 'Shield',
  },
  HOD: {
    name: 'HOD',
    description: 'Head of Department. Manages faculty and curriculum in their department.',
    systemRole: 'HOD' as SystemRole,
    scope: 'DEPARTMENT' as PermissionScope,
    hidden: false,
    icon: 'BookOpen',
  },
  FACULTY: {
    name: 'Faculty',
    description: 'Teacher/Faculty portal access. Department-scoped.',
    systemRole: 'FACULTY' as SystemRole,
    scope: 'DEPARTMENT' as PermissionScope,
    hidden: false,
    icon: 'User',
  },
};

// ============================================================
// GRANULAR PERMISSIONS
// ============================================================

export const PERMISSIONS = {
  // Users Management
  'users.view': { module: 'users', action: 'view', description: 'View user list and profiles' },
  'users.create': { module: 'users', action: 'create', description: 'Create new users' },
  'users.edit': { module: 'users', action: 'edit', description: 'Edit user details' },
  'users.delete': { module: 'users', action: 'delete', description: 'Delete users' },

  // Faculty Management (Department-Scoped)
  'faculty.view': { module: 'faculty', action: 'view', description: 'View department faculty' },
  'faculty.create': { module: 'faculty', action: 'create', description: 'Add faculty to department' },
  'faculty.edit': { module: 'faculty', action: 'edit', description: 'Edit faculty details' },
  'faculty.delete': { module: 'faculty', action: 'delete', description: 'Delete faculty' },
  'faculty.assign': { module: 'faculty', action: 'assign', description: 'Assign classes to faculty' },

  // Students Management
  'students.view': { module: 'students', action: 'view', description: 'View student list' },
  'students.create': { module: 'students', action: 'create', description: 'Add new students' },
  'students.edit': { module: 'students', action: 'edit', description: 'Edit student details' },
  'students.delete': { module: 'students', action: 'delete', description: 'Delete students' },
  'students.bulk_import': { module: 'students', action: 'bulk_import', description: 'Bulk import students' },

  // Exams Management (Department-Scoped)
  'exams.view': { module: 'exams', action: 'view', description: 'View department exams' },
  'exams.create': { module: 'exams', action: 'create', description: 'Create department exams' },
  'exams.edit': { module: 'exams', action: 'edit', description: 'Edit exam details' },
  'exams.delete': { module: 'exams', action: 'delete', description: 'Delete exams' },
  'exams.publish': { module: 'exams', action: 'publish', description: 'Publish exams' },

  // Marks Management
  'marks.view': { module: 'marks', action: 'view', description: 'View marks' },
  'marks.create': { module: 'marks', action: 'create', description: 'Enter marks' },
  'marks.edit': { module: 'marks', action: 'edit', description: 'Edit marks' },
  'marks.delete': { module: 'marks', action: 'delete', description: 'Delete marks' },
  'marks.submit': { module: 'marks', action: 'submit', description: 'Submit marks' },
  'marks.approve': { module: 'marks', action: 'approve', description: 'Approve marks' },
  'marks.lock': { module: 'marks', action: 'lock', description: 'Lock marks from editing' },

  // Results
  'results.view': { module: 'results', action: 'view', description: 'View results' },
  'results.publish': { module: 'results', action: 'publish', description: 'Publish results' },
  'results.export': { module: 'results', action: 'export', description: 'Export results' },

  // Reports
  'reports.view': { module: 'reports', action: 'view', description: 'View reports' },
  'reports.export': { module: 'reports', action: 'export', description: 'Export reports' },
  'reports.create': { module: 'reports', action: 'create', description: 'Create custom reports' },

  // Timetable
  'timetable.view': { module: 'timetable', action: 'view', description: 'View timetable' },
  'timetable.create': { module: 'timetable', action: 'create', description: 'Create timetable' },
  'timetable.edit': { module: 'timetable', action: 'edit', description: 'Edit timetable' },

  // Attendance
  'attendance.view': { module: 'attendance', action: 'view', description: 'View attendance' },
  'attendance.mark': { module: 'attendance', action: 'mark', description: 'Mark attendance' },
  'attendance.edit': { module: 'attendance', action: 'edit', description: 'Edit attendance records' },
  'attendance.correct': { module: 'attendance', action: 'correct', description: 'Correct attendance' },

  // Roles & Permissions
  'roles.view': { module: 'roles', action: 'view', description: 'View roles' },
  'roles.create': { module: 'roles', action: 'create', description: 'Create roles' },
  'roles.edit': { module: 'roles', action: 'edit', description: 'Edit roles' },
  'roles.delete': { module: 'roles', action: 'delete', description: 'Delete roles' },
  'permissions.view': { module: 'permissions', action: 'view', description: 'View permissions' },
  'permissions.edit': { module: 'permissions', action: 'edit', description: 'Edit permissions' },

  // Custom Features
  'custom_features.view': { module: 'custom_features', action: 'view', description: 'View custom features' },
  'custom_features.create': { module: 'custom_features', action: 'create', description: 'Create custom features' },
  'custom_features.edit': { module: 'custom_features', action: 'edit', description: 'Edit custom features' },
  'custom_features.delete': { module: 'custom_features', action: 'delete', description: 'Delete custom features' },
  'custom_features.assign': { module: 'custom_features', action: 'assign', description: 'Assign custom features to users' },

  // Settings
  'settings.view': { module: 'settings', action: 'view', description: 'View settings' },
  'settings.edit': { module: 'settings', action: 'edit', description: 'Edit settings' },

  // Audit & Logs
  'logs.view': { module: 'logs', action: 'view', description: 'View audit logs' },
  'logs.export': { module: 'logs', action: 'export', description: 'Export audit logs' },

  // Billing
  'billing.view': { module: 'billing', action: 'view', description: 'View billing' },
  'billing.edit': { module: 'billing', action: 'edit', description: 'Edit billing settings' },
};

// ============================================================
// ROLE PERMISSION MAPPINGS
// ============================================================

export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  // Super Admin: All permissions
  SUPER_ADMIN: Object.keys(PERMISSIONS),

  // Admin: Everything except billing & security
  ADMIN: [
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'faculty.view',
    'faculty.create',
    'faculty.edit',
    'faculty.delete',
    'faculty.assign',
    'students.view',
    'students.create',
    'students.edit',
    'students.delete',
    'students.bulk_import',
    'exams.view',
    'exams.create',
    'exams.edit',
    'exams.delete',
    'exams.publish',
    'marks.view',
    'marks.create',
    'marks.edit',
    'marks.delete',
    'marks.submit',
    'marks.approve',
    'marks.lock',
    'results.view',
    'results.publish',
    'results.export',
    'reports.view',
    'reports.export',
    'reports.create',
    'timetable.view',
    'timetable.create',
    'timetable.edit',
    'attendance.view',
    'attendance.mark',
    'attendance.edit',
    'attendance.correct',
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
    'permissions.view',
    'custom_features.view',
    'custom_features.create',
    'custom_features.edit',
    'custom_features.delete',
    'custom_features.assign',
    'settings.view',
    'settings.edit',
    'logs.view',
    'logs.export',
  ],

  // HOD: Faculty, exam, and student management in their department
  HOD: [
    'faculty.view',
    'faculty.create',
    'faculty.edit',
    'faculty.delete',
    'faculty.assign',
    'students.view',
    'students.edit',
    'exams.view',
    'exams.create',
    'exams.edit',
    'exams.delete',
    'exams.publish',
    'marks.view',
    'marks.edit',
    'marks.approve',
    'results.view',
    'results.publish',
    'results.export',
    'reports.view',
    'reports.export',
    'timetable.view',
    'timetable.create',
    'timetable.edit',
    'attendance.view',
    'attendance.mark',
    'attendance.edit',
    'attendance.correct',
    'logs.view',
    'custom_features.view',
  ],

  // FACULTY: View and manage their own classes in assigned departments
  FACULTY: [
    'students.view',
    'exams.view',
    'marks.view',
    'marks.create',
    'marks.edit',
    'marks.submit',
    'results.view',
    'timetable.view',
    'attendance.view',
    'attendance.mark',
    'attendance.correct',
    'reports.view',
  ],
};

// ============================================================
// PERMISSION MODULES (FOR UI GROUPING)
// ============================================================

export const PERMISSION_MODULES = [
  { key: 'users', label: 'Users', icon: 'Users' },
  { key: 'teachers', label: 'Teachers', icon: 'BookOpen' },
  { key: 'students', label: 'Students', icon: 'GraduationCap' },
  { key: 'exams', label: 'Exams', icon: 'ClipboardList' },
  { key: 'marks', label: 'Marks', icon: 'CheckSquare' },
  { key: 'results', label: 'Results', icon: 'BarChart' },
  { key: 'reports', label: 'Reports', icon: 'FileText' },
  { key: 'timetable', label: 'Timetable', icon: 'Calendar' },
  { key: 'attendance', label: 'Attendance', icon: 'Clock' },
  { key: 'roles', label: 'Roles & Permissions', icon: 'Shield' },
  { key: 'custom_features', label: 'Custom Features', icon: 'Zap' },
  { key: 'settings', label: 'Settings', icon: 'Settings' },
  { key: 'logs', label: 'Logs & Audit', icon: 'FileCheck' },
  { key: 'billing', label: 'Billing', icon: 'CreditCard' },
];

// ============================================================
// SENSITIVE OPERATIONS (REQUIRE CONFIRMATION)
// ============================================================

export const SENSITIVE_OPERATIONS = [
  'users.delete',
  'teachers.delete',
  'students.delete',
  'exams.delete',
  'marks.delete',
  'roles.delete',
  'custom_features.delete',
  'billing.edit',
];

// ============================================================
// FEATURE VISIBILITY RULES
// ============================================================

export const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', requiredPermission: null },
  { key: 'users', label: 'Users', requiredPermission: 'users.view' },
  { key: 'roles', label: 'Roles & Permissions', requiredPermission: 'roles.view' },
  { key: 'teachers', label: 'Teachers', requiredPermission: 'teachers.view' },
  { key: 'students', label: 'Students', requiredPermission: 'students.view' },
  { key: 'exams', label: 'Exams', requiredPermission: 'exams.view' },
  { key: 'timetable', label: 'Timetable', requiredPermission: 'timetable.view' },
  { key: 'results', label: 'Results', requiredPermission: 'results.view' },
  { key: 'reports', label: 'Reports', requiredPermission: 'reports.view' },
  { key: 'attendance', label: 'Attendance', requiredPermission: 'attendance.view' },
  { key: 'settings', label: 'Settings', requiredPermission: 'settings.view' },
  { key: 'logs', label: 'Logs', requiredPermission: 'logs.view' },
];
