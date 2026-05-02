export const APP_SESSION_COOKIE = 'app_session';

type AppSessionRole = 'admin' | 'faculty';

export interface AppSessionClaims {
  userId: string;
  email: string;
  role: AppSessionRole;
  schoolId: string;
  name: string;
  facultyId?: string | null;
}

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('Missing AUTH_SECRET');
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signPayload(payload: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createAppSessionCookie(claims: AppSessionClaims) {
  const payload = encodeBase64Url(JSON.stringify(claims));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

export async function verifyAppSessionCookie(rawCookie?: string | null): Promise<AppSessionClaims | null> {
  if (!rawCookie) {
    return null;
  }

  const [payload, signature] = rawCookie.split('.');

  if (!payload || !signature) {
    return null;
  }

  const key = await getSigningKey();
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlToBytes(signature),
    new TextEncoder().encode(payload)
  );

  if (!isValid) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as Partial<AppSessionClaims>;

    if (!parsed.userId || !parsed.email || !parsed.role || !parsed.schoolId || !parsed.name) {
      return null;
    }

    if (parsed.role !== 'admin' && parsed.role !== 'faculty') {
      return null;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      role: parsed.role,
      schoolId: parsed.schoolId,
      name: parsed.name,
      facultyId: parsed.facultyId ?? null,
    };
  } catch {
    return null;
  }
}
