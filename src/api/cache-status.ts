import { Hono } from 'hono';

export const cacheStatusRoute = new Hono();

cacheStatusRoute.get('/', (c) => {
  return c.json({ 
    message: 'Only request-level caching enabled',
    cache_file: 'database.sqlite',
    timestamp: new Date().toISOString() 
  });
});