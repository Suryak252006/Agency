import { type NextRequest } from 'next/server';
import { handlePatchRequest } from '@/modules/workflow/requests/http';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return handlePatchRequest(request, resolvedParams.id);
}
