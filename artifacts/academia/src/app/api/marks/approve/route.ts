import { handleAcceptMarks } from '@/modules/academic/marks/http';

// Legacy alias — forwards to accept handler
export const dynamic = 'force-dynamic';
export const POST = handleAcceptMarks;
