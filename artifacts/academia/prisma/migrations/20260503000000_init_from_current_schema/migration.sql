-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AccessScope" AS ENUM ('GLOBAL', 'DEPARTMENT', 'USER_SPECIFIC');

-- CreateEnum
CREATE TYPE "public"."CustomFeatureType" AS ENUM ('MENU_PAGE', 'BUTTON_ACTION', 'REPORT', 'API_ACCESS', 'HIDDEN_TOOL');

-- CreateEnum
CREATE TYPE "public"."FeatureStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."FileAssetStatus" AS ENUM ('UPLOADING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."MarksStatus" AS ENUM ('SUBMITTED', 'LOCK_PENDING', 'LOCKED');

-- CreateEnum
CREATE TYPE "public"."PermissionScope" AS ENUM ('GLOBAL', 'SCHOOL', 'BRANCH', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."RequestType" AS ENUM ('EDIT_MARKS', 'ACCESS_REQUEST', 'CORRECTION_REQUEST');

-- CreateEnum
CREATE TYPE "public"."SchoolBoard" AS ENUM ('CBSE', 'ICSE', 'STATE_BOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "public"."SubscriptionTier" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."SystemRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'HOD', 'FACULTY');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'FACULTY', 'PRINCIPAL', 'ACCOUNTANT', 'PARENT');

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Class" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClassStudent" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomFeature" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."CustomFeatureType" NOT NULL DEFAULT 'HIDDEN_TOOL',
    "scope" "public"."AccessScope" NOT NULL DEFAULT 'GLOBAL',
    "status" "public"."FeatureStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomFeatureAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "roleId" TEXT,
    "userId" TEXT,
    "departmentId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "requiresAcceptance" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "declinedAt" TIMESTAMP(3),
    "declinedBy" TEXT,
    "declineReason" TEXT,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFeatureAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "headId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Exam" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Faculty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacultyDepartment" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacultyDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FileAsset" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storagePath" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "public"."FileAssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Marks" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" "public"."MarksStatus" NOT NULL DEFAULT 'SUBMITTED',
    "lockRequestedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarksHistory" (
    "id" TEXT NOT NULL,
    "marksId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" "public"."MarksStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarksHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RBACLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RBACLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Request" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."RequestType" NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "marksId" TEXT,
    "reason" TEXT NOT NULL,
    "response" TEXT,
    "respondedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemRole" "public"."SystemRole",
    "scope" "public"."PermissionScope" NOT NULL DEFAULT 'SCHOOL',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SchoolConfig" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "gradingSystem" TEXT NOT NULL DEFAULT 'TEN_POINT',
    "workingDays" INTEGER NOT NULL DEFAULT 6,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "academicYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "logoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Student" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "board" "public"."SchoolBoard" NOT NULL DEFAULT 'CBSE',
    "medium" TEXT NOT NULL DEFAULT 'English',
    "subscriptionTier" "public"."SubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "subscriptionStatus" "public"."SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "schoolId" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_action_entityId_createdAt_idx" ON "public"."AuditLog"("schoolId" ASC, "action" ASC, "entityId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "public"."AuditLog"("schoolId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Class_departmentId_facultyId_idx" ON "public"."Class"("departmentId" ASC, "facultyId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_departmentId_grade_section_subject_key" ON "public"."Class"("schoolId" ASC, "departmentId" ASC, "grade" ASC, "section" ASC, "subject" ASC);

-- CreateIndex
CREATE INDEX "Class_schoolId_departmentId_idx" ON "public"."Class"("schoolId" ASC, "departmentId" ASC);

-- CreateIndex
CREATE INDEX "Class_schoolId_grade_section_idx" ON "public"."Class"("schoolId" ASC, "grade" ASC, "section" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ClassStudent_classId_studentId_key" ON "public"."ClassStudent"("classId" ASC, "studentId" ASC);

-- CreateIndex
CREATE INDEX "CustomFeature_module_idx" ON "public"."CustomFeature"("module" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFeature_schoolId_key_key" ON "public"."CustomFeature"("schoolId" ASC, "key" ASC);

-- CreateIndex
CREATE INDEX "CustomFeature_schoolId_status_idx" ON "public"."CustomFeature"("schoolId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "CustomFeatureAssignment_expiryDate_idx" ON "public"."CustomFeatureAssignment"("expiryDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CustomFeatureAssignment_featureId_roleId_userId_schoolId_key" ON "public"."CustomFeatureAssignment"("featureId" ASC, "roleId" ASC, "userId" ASC, "schoolId" ASC);

-- CreateIndex
CREATE INDEX "CustomFeatureAssignment_roleId_schoolId_idx" ON "public"."CustomFeatureAssignment"("roleId" ASC, "schoolId" ASC);

-- CreateIndex
CREATE INDEX "CustomFeatureAssignment_schoolId_featureId_idx" ON "public"."CustomFeatureAssignment"("schoolId" ASC, "featureId" ASC);

-- CreateIndex
CREATE INDEX "CustomFeatureAssignment_userId_schoolId_idx" ON "public"."CustomFeatureAssignment"("userId" ASC, "schoolId" ASC);

-- CreateIndex
CREATE INDEX "Department_headId_idx" ON "public"."Department"("headId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Department_schoolId_code_key" ON "public"."Department"("schoolId" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "Department_schoolId_idx" ON "public"."Department"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Department_schoolId_name_key" ON "public"."Department"("schoolId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "Exam_departmentId_classId_idx" ON "public"."Exam"("departmentId" ASC, "classId" ASC);

-- CreateIndex
CREATE INDEX "Exam_schoolId_departmentId_idx" ON "public"."Exam"("schoolId" ASC, "departmentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Exam_schoolId_departmentId_name_startDate_key" ON "public"."Exam"("schoolId" ASC, "departmentId" ASC, "name" ASC, "startDate" ASC);

-- CreateIndex
CREATE INDEX "Exam_schoolId_startDate_idx" ON "public"."Exam"("schoolId" ASC, "startDate" ASC);

-- CreateIndex
CREATE INDEX "Faculty_schoolId_idx" ON "public"."Faculty"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_userId_key" ON "public"."Faculty"("userId" ASC);

-- CreateIndex
CREATE INDEX "FacultyDepartment_departmentId_idx" ON "public"."FacultyDepartment"("departmentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FacultyDepartment_facultyId_departmentId_key" ON "public"."FacultyDepartment"("facultyId" ASC, "departmentId" ASC);

-- CreateIndex
CREATE INDEX "FileAsset_bucket_storageKey_idx" ON "public"."FileAsset"("bucket" ASC, "storageKey" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_bucket_storageKey_key" ON "public"."FileAsset"("bucket" ASC, "storageKey" ASC);

-- CreateIndex
CREATE INDEX "FileAsset_schoolId_ownerId_createdAt_idx" ON "public"."FileAsset"("schoolId" ASC, "ownerId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "FileAsset_schoolId_status_createdAt_idx" ON "public"."FileAsset"("schoolId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Marks_classId_examId_status_idx" ON "public"."Marks"("classId" ASC, "examId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Marks_examId_studentId_key" ON "public"."Marks"("examId" ASC, "studentId" ASC);

-- CreateIndex
CREATE INDEX "Marks_lockedBy_idx" ON "public"."Marks"("lockedBy" ASC);

-- CreateIndex
CREATE INDEX "Marks_schoolId_examId_classId_status_idx" ON "public"."Marks"("schoolId" ASC, "examId" ASC, "classId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "MarksHistory_marksId_createdAt_idx" ON "public"."MarksHistory"("marksId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "public"."Permission"("key" ASC);

-- CreateIndex
CREATE INDEX "Permission_module_idx" ON "public"."Permission"("module" ASC);

-- CreateIndex
CREATE INDEX "RBACLog_actorId_idx" ON "public"."RBACLog"("actorId" ASC);

-- CreateIndex
CREATE INDEX "RBACLog_schoolId_action_createdAt_idx" ON "public"."RBACLog"("schoolId" ASC, "action" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "RBACLog_schoolId_targetType_targetId_idx" ON "public"."RBACLog"("schoolId" ASC, "targetType" ASC, "targetId" ASC);

-- CreateIndex
CREATE INDEX "Request_schoolId_status_createdAt_idx" ON "public"."Request"("schoolId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Role_schoolId_name_key" ON "public"."Role"("schoolId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "Role_schoolId_status_idx" ON "public"."Role"("schoolId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Role_schoolId_systemRole_idx" ON "public"."Role"("schoolId" ASC, "systemRole" ASC);

-- CreateIndex
CREATE INDEX "RoleAssignment_departmentId_idx" ON "public"."RoleAssignment"("departmentId" ASC);

-- CreateIndex
CREATE INDEX "RoleAssignment_roleId_schoolId_departmentId_idx" ON "public"."RoleAssignment"("roleId" ASC, "schoolId" ASC, "departmentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_userId_roleId_schoolId_departmentId_key" ON "public"."RoleAssignment"("userId" ASC, "roleId" ASC, "schoolId" ASC, "departmentId" ASC);

-- CreateIndex
CREATE INDEX "RoleAssignment_userId_schoolId_departmentId_idx" ON "public"."RoleAssignment"("userId" ASC, "schoolId" ASC, "departmentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "public"."RolePermission"("roleId" ASC, "permissionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolConfig_schoolId_key" ON "public"."SchoolConfig"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_email_key" ON "public"."Student"("schoolId" ASC, "email" ASC);

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "public"."Student"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "Student_schoolId_name_idx" ON "public"."Student"("schoolId" ASC, "name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "public"."Tenant"("slug" ASC);

-- CreateIndex
CREATE INDEX "Tenant_subscriptionStatus_isActive_idx" ON "public"."Tenant"("subscriptionStatus" ASC, "isActive" ASC);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE INDEX "User_schoolId_isActive_idx" ON "public"."User"("schoolId" ASC, "isActive" ASC);

-- CreateIndex
CREATE INDEX "User_schoolId_role_idx" ON "public"."User"("schoolId" ASC, "role" ASC);

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClassStudent" ADD CONSTRAINT "ClassStudent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClassStudent" ADD CONSTRAINT "ClassStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFeature" ADD CONSTRAINT "CustomFeature_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFeature" ADD CONSTRAINT "CustomFeature_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFeatureAssignment" ADD CONSTRAINT "CustomFeatureAssignment_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFeatureAssignment" ADD CONSTRAINT "CustomFeatureAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFeatureAssignment" ADD CONSTRAINT "CustomFeatureAssignment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "public"."CustomFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFeatureAssignment" ADD CONSTRAINT "CustomFeatureAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFeatureAssignment" ADD CONSTRAINT "CustomFeatureAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFeatureAssignment" ADD CONSTRAINT "CustomFeatureAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_headId_fkey" FOREIGN KEY ("headId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Exam" ADD CONSTRAINT "Exam_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Exam" ADD CONSTRAINT "Exam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Faculty" ADD CONSTRAINT "Faculty_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Faculty" ADD CONSTRAINT "Faculty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyDepartment" ADD CONSTRAINT "FacultyDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacultyDepartment" ADD CONSTRAINT "FacultyDepartment_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."Faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FileAsset" ADD CONSTRAINT "FileAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FileAsset" ADD CONSTRAINT "FileAsset_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Marks" ADD CONSTRAINT "Marks_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Marks" ADD CONSTRAINT "Marks_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Marks" ADD CONSTRAINT "Marks_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Marks" ADD CONSTRAINT "Marks_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Marks" ADD CONSTRAINT "Marks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarksHistory" ADD CONSTRAINT "MarksHistory_marksId_fkey" FOREIGN KEY ("marksId") REFERENCES "public"."Marks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RBACLog" ADD CONSTRAINT "RBACLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RBACLog" ADD CONSTRAINT "RBACLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleAssignment" ADD CONSTRAINT "RoleAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleAssignment" ADD CONSTRAINT "RoleAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleAssignment" ADD CONSTRAINT "RoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchoolConfig" ADD CONSTRAINT "SchoolConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

