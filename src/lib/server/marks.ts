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

export async function saveDraftMark(
  examId: string,
  classId: string,
  studentId: string,
  value: string,
  user: SessionUser
) {
  await assertExamAccess(user, examId, classId);

  // Fetch exam to validate against maxMarks
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

  // Validate mark value against exam max
  if (value !== 'AB' && value !== 'NA') {
    const numValue = parseInt(value, 10);
    if (numValue > exam.maxMarks) {
      throw makeError('VALIDATION_ERROR', `Mark cannot exceed exam maximum of ${exam.maxMarks}`);
    }
  }

  const enrollment = await db.classStudent.findUnique({
    where: {
      classId_studentId: {
        classId,
        studentId,
      },
    },
  });

  if (!enrollment) {
    throw makeError('NOT_FOUND', 'Student is not enrolled in this class');
  }

  const existing = await db.marks.findUnique({
    where: {
      examId_studentId: {
        examId,
        studentId,
      },
    },
  });

  if (existing?.schoolId && existing.schoolId !== user.schoolId) {
    throw makeError('FORBIDDEN', 'Cross-school marks access denied');
  }

  // Prevent editing if already submitted or beyond
  if (existing?.status && existing.status !== 'DRAFT') {
    throw makeError('CONFLICT', `Cannot edit marks in ${existing.status} status. Submit edit request instead.`);
  }

  const saved = await db.marks.upsert({
    where: {
      examId_studentId: {
        examId,
        studentId,
      },
    },
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
      status: 'DRAFT',
    },
  });

  await createAuditLog(user.id, user.schoolId, 'MARKS_DRAFT_SAVED', 'marks', saved.id, {
    examId,
    classId,
    studentId,
    value,
  });

  return saved;
}

export async function submitMarks(examId: string, classId: string, user: SessionUser) {
  await assertExamAccess(user, examId, classId);

  const result = await db.marks.updateMany({
    where: {
      schoolId: user.schoolId,
      examId,
      classId,
      status: 'DRAFT',
    },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  });

  await createAuditLog(user.id, user.schoolId, 'MARKS_SUBMITTED', 'marks_batch', examId, {
    classId,
    count: result.count,
  });

  return result;
}

export async function approveMarks(marksIds: string[], user: SessionUser) {
  // Verify all marks belong to this school before updating
  const marksToApprove = await db.marks.findMany({
    where: {
      id: { in: marksIds },
      schoolId: user.schoolId,
      status: 'SUBMITTED',
    },
    select: { id: true },
  });

  if (marksToApprove.length !== marksIds.length) {
    throw makeError('FORBIDDEN', 'Some marks not found or not in SUBMITTED status');
  }

  const result = await db.marks.updateMany({
    where: {
      schoolId: user.schoolId,
      id: { in: marksIds },
      status: 'SUBMITTED',
    },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  await createAuditLog(user.id, user.schoolId, 'MARKS_APPROVED', 'marks_batch', marksIds[0], {
    count: result.count,
    marksIds,
  });

  return result;
}

export async function lockMarks(marksIds: string[], user: SessionUser) {
  // Verify all marks belong to this school and are in APPROVED status
  const marksToLock = await db.marks.findMany({
    where: {
      id: { in: marksIds },
      schoolId: user.schoolId,
      status: 'APPROVED',
    },
    select: { id: true },
  });

  if (marksToLock.length !== marksIds.length) {
    throw makeError('FORBIDDEN', 'Some marks not found or not in APPROVED status');
  }

  const result = await db.marks.updateMany({
    where: {
      schoolId: user.schoolId,
      id: { in: marksIds },
      status: 'APPROVED',
    },
    data: {
      status: 'LOCKED',
      lockedAt: new Date(),
    },
  });

  await createAuditLog(user.id, user.schoolId, 'MARKS_LOCKED', 'marks_batch', marksIds[0], {
    count: result.count,
    marksIds,
  });

  return result;
}
