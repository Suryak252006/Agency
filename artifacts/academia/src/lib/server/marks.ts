import { db } from '@/lib/db';
import type { SessionUser } from '@/lib/server/session';

function makeError(code: string, message: string) {
  const error = new Error(message);
  (error as Error & { code: string }).code = code;
  return error;
}

export async function assertClassAccess(user: SessionUser, classId: string) {
  const classRecord = await db.class.findFirst({
    where: user.role === 'admin'
      ? {
          id: classId,
          schoolId: user.schoolId,
        }
      : {
          id: classId,
          schoolId: user.schoolId,
          faculty: {
            userId: user.id,
          },
        },
    include: {
      faculty: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!classRecord) {
    throw makeError(user.role === 'admin' ? 'NOT_FOUND' : 'FORBIDDEN', 'Class access denied');
  }

  return classRecord;
}

export async function assertExamAccess(user: SessionUser, examId: string, classId: string) {
  await assertClassAccess(user, classId);

  const exam = await db.exam.findFirst({
    where: {
      id: examId,
      schoolId: user.schoolId,
      OR: [{ classId }, { classId: null }],
    },
  });

  if (!exam) {
    throw makeError('NOT_FOUND', 'Exam not found for this class');
  }

  return exam;
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
    data: {
      userId,
      schoolId,
      action,
      entity,
      entityId,
      changes: changes as any,
      ipAddress,
    },
  });
}

/**
 * Save a mark for a student — creates/updates in SUBMITTED status.
 * Blocked if mark is already LOCKED or ACCEPTED.
 */
export async function saveMark(
  examId: string,
  classId: string,
  studentId: string,
  value: string,
  user: SessionUser
) {
  await assertExamAccess(user, examId, classId);

  const exam = await db.exam.findUnique({
    where: { id: examId },
    select: { maxMarks: true, schoolId: true },
  });

  if (!exam) {
    throw makeError('NOT_FOUND', 'Exam not found');
  }

  if (exam.schoolId !== user.schoolId) {
    throw makeError('FORBIDDEN', 'Exam access denied');
  }

  if (value !== 'AB' && value !== 'NA') {
    const numValue = parseInt(value, 10);
    if (numValue > exam.maxMarks) {
      throw makeError('VALIDATION_ERROR', `Mark cannot exceed exam maximum of ${exam.maxMarks}`);
    }
  }

  const enrollment = await db.classStudent.findUnique({
    where: {
      classId_studentId: { classId, studentId },
    },
  });

  if (!enrollment) {
    throw makeError('NOT_FOUND', 'Student is not enrolled in this class');
  }

  const existing = await db.marks.findUnique({
    where: { examId_studentId: { examId, studentId } },
  });

  if (existing?.schoolId && existing.schoolId !== user.schoolId) {
    throw makeError('FORBIDDEN', 'Cross-school marks access denied');
  }

  if (existing?.status && (existing.status === 'LOCKED' || existing.status === 'ACCEPTED')) {
    throw makeError('CONFLICT', `Cannot edit marks in ${existing.status} status. Submit an edit request instead.`);
  }

  const saved = await db.marks.upsert({
    where: { examId_studentId: { examId, studentId } },
    update: {
      value,
      classId,
      updatedAt: new Date(),
    },
    create: {
      examId,
      classId,
      studentId,
      schoolId: user.schoolId,
      value,
      status: 'SUBMITTED',
    },
  });

  await createAuditLog(user.id, user.schoolId, 'MARKS_SAVED', 'marks', saved.id, {
    examId,
    classId,
    studentId,
    value,
  });

  return saved;
}

/**
 * Faculty locks marks for an exam+class — SUBMITTED → LOCKED.
 * Once locked, marks are read-only until Admin/HOD accepts them.
 */
export async function lockMarks(examId: string, classId: string, user: SessionUser) {
  await assertExamAccess(user, examId, classId);

  const result = await db.marks.updateMany({
    where: {
      schoolId: user.schoolId,
      examId,
      classId,
      status: 'SUBMITTED',
    },
    data: {
      status: 'LOCKED',
      lockedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw makeError('CONFLICT', 'No submitted marks found to lock for this exam and class');
  }

  await createAuditLog(user.id, user.schoolId, 'MARKS_LOCKED', 'marks_batch', examId, {
    classId,
    count: result.count,
  });

  return result;
}

/**
 * Admin or HOD accepts locked marks — LOCKED → ACCEPTED.
 * Accepts by marksIds list.
 */
export async function acceptMarks(marksIds: string[], user: SessionUser) {
  const marksToAccept = await db.marks.findMany({
    where: {
      id: { in: marksIds },
      schoolId: user.schoolId,
      status: 'LOCKED',
    },
    select: { id: true },
  });

  if (marksToAccept.length !== marksIds.length) {
    throw makeError('FORBIDDEN', 'Some marks not found or not in LOCKED status');
  }

  const result = await db.marks.updateMany({
    where: {
      schoolId: user.schoolId,
      id: { in: marksIds },
      status: 'LOCKED',
    },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      acceptedBy: user.id,
    },
  });

  await createAuditLog(user.id, user.schoolId, 'MARKS_ACCEPTED', 'marks_batch', marksIds[0], {
    count: result.count,
    marksIds,
  });

  return result;
}
