import { handleCreateRequest, handleGetRequests } from '@/modules/workflow/requests/http';

export const dynamic = 'force-dynamic';
export const GET = handleGetRequests;
export const POST = handleCreateRequest;
