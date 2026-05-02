import { handleApproveLock } from '@/modules/academic/marks/http';

// Legacy alias — forwards to approve-lock handler (Admin/HOD)
export const dynamic = 'force-dynamic';
export const POST = handleApproveLock;
