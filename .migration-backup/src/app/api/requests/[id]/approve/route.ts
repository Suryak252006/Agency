import { type NextRequest } from 'next/server';
import { handleApproveRequest } from '@/modules/workflow/requests/http';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return handleApproveRequest(request, resolvedParams.id);
}
