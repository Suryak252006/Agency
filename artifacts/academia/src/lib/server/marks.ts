import { db } from '@/lib/db';
import { tenantDb } from '@/lib/db-tenant';
import type { SessionUser } from '@/lib/server/session';

function makeError(code: string, message: string) {
  const error = new Error(message);
  (error as Error & { code: string }).code = code;
  return error;
}

export async function assertClassAccess(user: SessionUser, classId: string) {
  const tdb = tenantDb(user.schoolId);
  const classRecord = await tdb.class.findFirst({
    where: user.role === 'admin'
      ? { id: classId }
      : { id: classId, faculty: { userId: user.id } },
    select: {
      id: true,
      faculty: { select: { userId: true } },
    },
  });

  if (!classRecord) {
    throw makeError(user.role === 'admin' ? 'NOT_FOUND' : 'FORBIDDEN', 'Class access denied');
  }

  return classRecord;
}

export async function assertExamAccess(user: SessionUser, examId: string, classId: string) {
  await assertClassAccess(user, classId);

  const tdb = tenantDb(user.schoolId);
  const exam = await tdb.exam.findFirst({
    where: {
      id: examId,
      OR: [{ classId }, { classId: null }],
    },
  });

  if (!exam) throw makeError('NOT_FOUND', 'Exam not found for this class');
  return exam;
}

/**
 * Check whether the user can approve/reject lock requests for a given classId.
 *
 * Rules:
 *  - ADMIN → can approve for any class in their school
 *  - FACULTY who is a HOD (i.e. is the `headId` of a Department in their school)
 *    → can approve for any class in their school
 *  - Plain FACULTY → cannot approve
 */
async function assertCanApproveLock(user: SessionUser, classId: string) {
  if (user.role === 'admin') return;

  const tdb = tenantDb(user.schoolId);

  const hodDept = await tdb.department.findFirst({
    where: { headId: user.id },
    select: { id: true },
  });

  if (!hodDept) {
    throw makeError('FORBIDDEN', 'Only Admin or HOD can approve or reject lock requests');
  }

  const cls = await tdb.class.findFirst({
    where: { id: classId },
    select: { id: true },
  });

  if (!cls) throw makeError('FORBIDDEN', 'Class not found in your school');
}

export async function createAuditLog(
  userId: string,
  schoolId: string,
  action: string,
  entity: string,
  entityId: string,
  changes?: unknown,
  ipAddress?: string
) {
  return db.auditLog.create({
    data: { userId, schoolId, action, entity, entityId, changes: changes as any, ipAddress },
  });
}

/**
 * Record a marks history entry for full audit trail.
 * marksHistory has no schoolId — scoped via the parent marksId FK.
 */
async function addMarksHistory(
  marksId: string,
  value: string,
  status: string,
  changedBy: string,
  reason?: string
) {
  return db.marksHistory.create({
    data: { marksId, value, status: status as any, changedBy, reason },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Faculty actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a mark for a student.
 * Creates or updates in SUBMITTED status.
 * Blocked if status is LOCK_PENDING or LOCKED.
 */
export async function saveMark(
  examId: string,
  classId: string,
  studentId: string,
  value: string,
  user: SessionUser
) {
  const tdb = tenantDb(user.schoolId);
  await assertExamAccess(user, examId, classId);

  // Exam validation — use tdb so schoolId is auto-injected
  const exam = await tdb.exam.findFirst({
    where: { id: examId },
    select: { maxMarks: true },
  });
  if (!exam) throw makeError('NOT_FOUND', 'Exam not found');

  if (value !== 'AB' && value !== 'NA') {
    const numValue = parseInt(value, 10);
    if (numValue > exam.maxMarks) {
      throw makeError('VALIDATION_ERROR', `Mark cannot exceed exam maximum of ${exam.maxMarks}`);
    }
  }

  // classStudent has no schoolId — scope via FK
  const enrollment = await db.classStudent.findUnique({
    where: { classId_studentId: { classId, studentId } },
  });
  if (!enrollment) throw makeError('NOT_FOUND', 'Student is not enrolled in this class');

  // Check existing mark state
  const existing = await db.marks.findUnique({
    where: { examId_studentId: { examId, studentId } },
    select: { id: true, schoolId: true, status: true },
  });

  if (existing?.schoolId && existing.schoolId !== user.schoolId) {
    throw makeError('FORBIDDEN', 'Cross-school marks access denied');
  }

  if (existing?.status === 'LOCK_PENDING') {
    throw makeError('CONFLICT', 'Cannot edit marks while a lock request is pending. Cancel the lock request first.');
  }
  if (existing?.status === 'LOCKED') {
    throw makeError('CONFLICT', 'Cannot edit locked marks. Submit an edit request.');
  }

  // upsert: create always sets schoolId explicitly via create clause
  const saved = await db.marks.upsert({
    where: { examId_studentId: { examId, studentId } },
    update: { value, classId, updatedAt: new Date() },
    create: { examId, classId, studentId, schoolId: user.schoolId, value, status: 'SUBMITTED' },
  });

  await addMarksHistory(saved.id, value, 'SUBMITTED', user.id);
  await createAuditLog(user.id, user.schoolId, 'MARKS_SAVED', 'marks', saved.id, { examId, classId, studentId, value });

  return saved;
}

/**
 * Faculty requests a lock for all SUBMITTED marks in an exam+class.
 * Transitions: SUBMITTED → LOCK_PENDING
 */
export async function requestLock(examId: string, classId: string, user: SessionUser) {
  const tdb = tenantDb(user.schoolId);
  await assertExamAccess(user, examId, classId);

  const submittedMarks = await tdb.marks.findMany({
    where: { examId, classId, status: 'SUBMITTED' },
    select: { id: true, value: true },
  });

  if (submittedMarks.length === 0) {
    throw makeError('CONFLICT', 'No submitted marks found to request lock for this exam and class');
  }

  const now = new Date();
  await tdb.marks.updateMany({
    where: { examId, classId, status: 'SUBMITTED' },
    data: { status: 'LOCK_PENDING', lockRequestedAt: now },
  });

  await Promise.all(
    submittedMarks.map((m) => addMarksHistory(m.id, m.value, 'LOCK_PENDING', user.id))
  );

  await createAuditLog(user.id, user.schoolId, 'MARKS_LOCK_REQUESTED', 'marks_batch', examId, {
    classId,
    count: submittedMarks.length,
  });

  return { count: submittedMarks.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin / HOD actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin or HOD approves a lock request.
 * Transitions: LOCK_PENDING → LOCKED
 */
export async function approveLock(marksIds: string[], user: SessionUser) {
  const tdb = tenantDb(user.schoolId);

  const marksToLock = await tdb.marks.findMany({
    where: { id: { in: marksIds }, status: 'LOCK_PENDING' },
    select: { id: true, classId: true, value: true },
  });

  if (marksToLock.length !== marksIds.length) {
    throw makeError('FORBIDDEN', 'Some marks not found or not in LOCK_PENDING status');
  }

  const uniqueClassIds = [...new Set(marksToLock.map((m) => m.classId))];
  for (const classId of uniqueClassIds) {
    await assertCanApproveLock(user, classId);
  }

  const now = new Date();
  await tdb.marks.updateMany({
    where: { id: { in: marksIds }, status: 'LOCK_PENDING' },
    data: { status: 'LOCKED', lockedAt: now, lockedBy: user.id },
  });

  await Promise.all(
    marksToLock.map((m) => addMarksHistory(m.id, m.value, 'LOCKED', user.id))
  );

  await createAuditLog(user.id, user.schoolId, 'MARKS_LOCK_APPROVED', 'marks_batch', marksIds[0], {
    count: marksToLock.length,
    marksIds,
    approvedBy: user.id,
  });

  return { count: marksToLock.length };
}

/**
 * Admin or HOD rejects a lock request.
 * Transitions: LOCK_PENDING → SUBMITTED (marks become editable again).
 */
export async function rejectLock(marksIds: string[], reason: string, user: SessionUser) {
  const tdb = tenantDb(user.schoolId);

  const marksToReject = await tdb.marks.findMany({
    where: { id: { in: marksIds }, status: 'LOCK_PENDING' },
    select: { id: true, classId: true, value: true },
  });

  if (marksToReject.length !== marksIds.length) {
    throw makeError('FORBIDDEN', 'Some marks not found or not in LOCK_PENDING status');
  }

  const uniqueClassIds = [...new Set(marksToReject.map((m) => m.classId))];
  for (const classId of uniqueClassIds) {
    await assertCanApproveLock(user, classId);
  }

  await tdb.marks.updateMany({
    where: { id: { in: marksIds }, status: 'LOCK_PENDING' },
    data: { status: 'SUBMITTED', lockRequestedAt: null },
  });

  await Promise.all(
    marksToReject.map((m) =>
      addMarksHistory(m.id, m.value, 'SUBMITTED', user.id, `Lock rejected: ${reason}`)
    )
  );

  await createAuditLog(user.id, user.schoolId, 'MARKS_LOCK_REJECTED', 'marks_batch', marksIds[0], {
    count: marksToReject.length,
    marksIds,
    rejectedBy: user.id,
    reason,
  });

  return { count: marksToReject.length };
}
