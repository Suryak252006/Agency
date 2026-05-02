import { type NextRequest } from 'next/server';
import { handleListClassStudents } from '@/modules/academic/classes/http';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return handleListClassStudents(request, resolvedParams.id);
}
