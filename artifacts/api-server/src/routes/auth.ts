import { Router } from 'express';
import { compare } from 'bcryptjs';
import { APP_SESSION_COOKIE, createAppSessionCookie, type AppSessionRole } from '../lib/session-cookie.js';
import { db } from '../lib/db.js';
import { generateRequestId, apiSuccess, sendApiError, handleApiError } from '../lib/api-helpers.js';
import { getSessionUser, homeForRole } from '../lib/session.js';
import { z } from 'zod';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function dbRoleToSessionRole(dbRole: string): AppSessionRole {
  switch (dbRole) {
    case 'ADMIN': case 'PRINCIPAL': case 'ACCOUNTANT': return 'admin';
    case 'FACULTY': return 'faculty';
    case 'PARENT': return 'parent';
    default: return 'faculty';
  }
}

router.post('/auth/login', async (req, res) => {
  const requestId = generateRequestId();
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendApiError(res, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input', requestId, undefined, 400);
      return;
    }
    const { email, password } = parsed.data;
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, password: true, role: true,
        schoolId: true, name: true, isActive: true,
        faculty: { select: { id: true } },
      },
    });
    const passwordMatch = user ? await compare(password, user.password) : false;
    if (!user || !passwordMatch) {
      sendApiError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', requestId, undefined, 401);
      return;
    }
    if (user.isActive === false) {
      sendApiError(res, 'ACCOUNT_INACTIVE', 'Your account has been deactivated', requestId, undefined, 403);
      return;
    }
    const role = dbRoleToSessionRole(user.role);
    const redirectTo = homeForRole(role);
    const sessionCookie = await createAppSessionCookie({
      userId: user.id,
      email: user.email,
      role,
      schoolId: user.schoolId,
      name: user.name,
      facultyId: user.faculty?.id ?? null,
    });
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch((err: any) => console.error('Failed to update lastLoginAt:', err));
    res.setHeader('Set-Cookie', `${APP_SESSION_COOKIE}=${sessionCookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 8}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    res.json(apiSuccess({ success: true, redirectTo }, requestId));
  } catch (error) {
    handleApiError(res, error, requestId, 'POST /api/auth/login');
  }
});

router.post('/auth/logout', (req, res) => {
  const requestId = generateRequestId();
  res.setHeader('Set-Cookie', `${APP_SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  res.json(apiSuccess({ loggedOut: true }, requestId));
});

router.get('/auth/me', async (req, res) => {
  const requestId = generateRequestId();
  const user = await getSessionUser(req);
  if (!user) {
    sendApiError(res, 'UNAUTHORIZED', 'Unauthorized', requestId, undefined, 401);
    return;
  }
  res.json(apiSuccess({ user }, requestId));
});

export default router;
