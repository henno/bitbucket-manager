import { Hono } from 'hono';
import { clearCache } from '../cache';

export const cacheStatusRoute = new Hono();

cacheStatusRoute.get('/', (c) => {
  return c.json({ 
    message: 'Only request-level caching enabled',
    cache_file: 'database.sqlite',
    timestamp: new Date().toISOString() 
  });
});

cacheStatusRoute.post('/clear', async (c) => {
  try {
    await clearCache();
    return c.json({ 
      success: true,
      message: 'All cache data has been cleared successfully',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return c.json({ 
      success: false,
      error: 'Failed to clear cache: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, 500);
  }
});