// ============================================================
// API: Custom Feature Assignments
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAppSession } from '@/lib/supabase/middleware';

// POST /api/rbac/custom-features/assign
export async function POST(request: NextRequest) {
  try {
    const appSession = await getAppSession(request);
    if (!appSession?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      featureId,
      roleId,
      userId,
      departmentId,
      startDate,
      expiryDate,
      requiresAcceptance,
    } = await request.json();

    const schoolId = appSession.schoolId;

    // Validate feature exists
    const feature = await prisma.customFeature.findUnique({
      where: { id: featureId },
    });

    if (!feature || feature.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    // Ensure either roleId or userId is provided
    if (!roleId && !userId) {
      return NextResponse.json(
        { error: 'Either roleId or userId must be provided' },
        { status: 400 },
      );
    }

    // Create assignment
    const assignment = await prisma.customFeatureAssignment.create({
      data: {
        schoolId,
        featureId,
        roleId: roleId || null,
        userId: userId || null,
        departmentId: departmentId || null,
        startDate: new Date(startDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        requiresAcceptance: requiresAcceptance || false,
        assignedBy: appSession.userId,
      },
      include: {
        feature: true,
        role: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    // Audit log
    await prisma.rBACLog.create({
      data: {
        schoolId,
        actorId: appSession.userId,
        action: 'CUSTOM_FEATURE_ASSIGNED',
        targetType: 'assignment',
        targetId: assignment.id,
        metadata: {
          featureId,
          roleId: roleId || null,
          userId: userId || null,
          requiresAcceptance,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('POST /api/rbac/custom-features/assign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/rbac/custom-features/assign/[assignmentId]/accept
export async function acceptFeature(assignmentId: string, request: NextRequest) {
  try {
    const appSession = await getAppSession(request);
    if (!appSession?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.customFeatureAssignment.findUnique({
      where: { id: assignmentId },
      include: { feature: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify user is recipient
    if (assignment.userId && assignment.userId !== appSession.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update assignment
    const updated = await prisma.customFeatureAssignment.update({
      where: { id: assignmentId },
      data: {
        acceptedAt: new Date(),
        acceptedBy: appSession.userId,
      },
    });

    // Audit log
    await prisma.rBACLog.create({
      data: {
        schoolId: assignment.schoolId,
        actorId: appSession.userId,
        action: 'CUSTOM_FEATURE_ACCEPTED',
        targetType: 'assignment',
        targetId: assignmentId,
        metadata: { featureId: assignment.featureId },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Accept feature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/rbac/custom-features/assign/[assignmentId]/decline
export async function declineFeature(
  assignmentId: string,
  request: NextRequest,
  reason?: string,
) {
  try {
    const appSession = await getAppSession(request);
    if (!appSession?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.customFeatureAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify user is recipient
    if (assignment.userId && assignment.userId !== appSession.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update assignment
    const updated = await prisma.customFeatureAssignment.update({
      where: { id: assignmentId },
      data: {
        declinedAt: new Date(),
        declinedBy: appSession.userId,
        declineReason: reason || null,
      },
    });

    // Audit log
    await prisma.rBACLog.create({
      data: {
        schoolId: assignment.schoolId,
        actorId: appSession.userId,
        action: 'CUSTOM_FEATURE_DECLINED',
        targetType: 'assignment',
        targetId: assignmentId,
        metadata: { featureId: assignment.featureId, reason },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Decline feature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/rbac/custom-features/assign/[assignmentId]
export async function revokeFeature(assignmentId: string, request: NextRequest) {
  try {
    const appSession = await getAppSession(request);
    if (!appSession?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.customFeatureAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Delete assignment
    await prisma.customFeatureAssignment.delete({
      where: { id: assignmentId },
    });

    // Audit log
    await prisma.rBACLog.create({
      data: {
        schoolId: assignment.schoolId,
        actorId: appSession.userId,
        action: 'CUSTOM_FEATURE_REVOKED',
        targetType: 'assignment',
        targetId: assignmentId,
        metadata: { featureId: assignment.featureId },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke feature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
