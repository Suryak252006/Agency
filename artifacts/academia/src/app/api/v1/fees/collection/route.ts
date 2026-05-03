import { type NextRequest, NextResponse } from 'next/server';
import { apiSuccess, generateRequestId, handleApiError } from '@/lib/server/api';
import { requireSessionUser } from '@/lib/server/session';
import { tenantDb } from '@/lib/db-tenant';
import { RecordFeeCollectionSchema, PaginationSchema } from '@/schemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const { searchParams } = new URL(request.url);
    const { page, limit } = PaginationSchema.parse({
      page: searchParams.get('page') ?? 0,
      limit: searchParams.get('limit') ?? 20,
    });
    const studentId = searchParams.get('studentId') ?? undefined;

    const where: Record<string, unknown> = { schoolId: user.schoolId };
    if (studentId) where.studentId = studentId;

    const [collections, total] = await Promise.all([
      tdb.feeCollection.findMany({
        where,
        include: {
          installments: {
            include: { installment: { select: { id: true, dueDate: true, amount: true } } },
          },
        },
        orderBy: { receiptDate: 'desc' },
        skip: page * limit,
        take: limit,
      }),
      tdb.feeCollection.count({ where }),
    ]);

    return NextResponse.json(apiSuccess({ collections, total, page, limit }, requestId));
  } catch (error) {
    return handleApiError(error, requestId, 'GET /api/v1/fees/collection');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await requireSessionUser({ roles: ['admin'] });
    const tdb = tenantDb(user.schoolId);
    const body = await request.json();
    const data = RecordFeeCollectionSchema.parse(body);

    const currentYear = await tdb.academicYear.findFirst({
      where: { schoolId: user.schoolId, isCurrent: true },
      select: { id: true },
    });
    const academicYearId = currentYear?.id ?? data.academicYearId;
    if (!academicYearId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'No current academic year found' },
        { status: 400 }
      );
    }

    const seq = await tdb.receiptSequence.upsert({
      where: { schoolId_academicYearId: { schoolId: user.schoolId, academicYearId } },
      create: { schoolId: user.schoolId, academicYearId, prefix: 'RCP', lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });

    const receiptNo = `${seq.prefix}-${String(seq.lastSeq).padStart(6, '0')}`;

    const collection = await tdb.feeCollection.create({
      data: {
        schoolId: user.schoolId,
        studentId: data.studentId,
        academicYearId,
        amount: data.amount,
        paymentMode: data.mode,
        transactionRef: data.transactionRef ?? null,
        notes: data.note ?? null,
        receiptNo,
        receiptDate: data.paidAt ? new Date(data.paidAt) : new Date(),
        collectedBy: user.id,
        installments: {
          create: data.installmentIds.map((installmentId) => ({
            installmentId,
            amountApplied: data.amount / data.installmentIds.length,
          })),
        },
      },
      include: {
        installments: { include: { installment: true } },
      },
    });

    await tdb.feeInstallment.updateMany({
      where: { id: { in: data.installmentIds } },
      data: { status: 'PAID', paidAt: collection.receiptDate, paidAmount: data.amount / data.installmentIds.length },
    });

    return NextResponse.json(apiSuccess({ collection }, requestId), { status: 201 });
  } catch (error) {
    return handleApiError(error, requestId, 'POST /api/v1/fees/collection');
  }
}
