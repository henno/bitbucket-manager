import { Hono } from 'hono';
import { validateCredentials, createSession } from '../auth';

export const sessionsRoute = new Hono();

sessionsRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.username || !body.password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    if (typeof body.username !== 'string' || typeof body.password !== 'string') {
      return c.json({ error: 'Username and password must be strings' }, 400);
    }

    if (body.username.trim() === '' || body.password.trim() === '') {
      return c.json({ error: 'Username and password cannot be empty' }, 400);
    }

    const isValid = await validateCredentials(body.username.trim(), body.password);
    
    if (!isValid) {
      return c.json({ error: 'Invalid username or password' }, 401);
    }

    const sessionId = createSession(1); // userId 1 for now
    return c.json({ sessionId });

  } catch (error: unknown) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});