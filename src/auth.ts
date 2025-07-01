import { Context, Next } from 'hono';
import { CacheManager } from './cache';
import { createHash } from 'crypto';

const cache = new CacheManager('database.sqlite');

export async function validateCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.APP_USER;
  const expectedPassHash = process.env.APP_PASS;

  if (!expectedUser || !expectedPassHash) {
    throw new Error('APP_USER and APP_PASS must be set in environment');
  }

  if (username !== expectedUser) {
    return false;
  }

  const passwordHash = createHash('sha256').update(password).digest('hex');
  return passwordHash === expectedPassHash;
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function createSession(userId: number): string {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  cache.createSession(sessionId, userId, expiresAt);
  return sessionId;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json({ error: 'Authorization header required' }, 401);
  }

  const sessionId = authHeader.replace('Bearer ', '');
  const session = cache.getSession(sessionId);

  if (!session) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  // Add user info to context
  c.set('userId', session.userId);
  c.set('sessionId', sessionId);

  await next();
}