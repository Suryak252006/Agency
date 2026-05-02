import { handleLockMarks } from '@/modules/academic/marks/http';

// Legacy alias — forwards to lock handler
export const dynamic = 'force-dynamic';
export const POST = handleLockMarks;
