import { handleRequestLock } from '@/modules/academic/marks/http';

// Legacy alias — forwards to request-lock handler (faculty)
export const dynamic = 'force-dynamic';
export const POST = handleRequestLock;
