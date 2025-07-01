import { Hono } from 'hono';
import { authMiddleware } from '../auth';
import { PeopleService } from '../people-service';

export function createPeopleRoute(peopleService: PeopleService) {
  const route = new Hono();

  route.get('/', authMiddleware, async (c) => {
    try {
      const maxAge = c.req.query('maxAge');
      const maxAgeMs = maxAge ? parseInt(maxAge) * 1000 : 60 * 60 * 1000; // default 1 hour
      
      console.log(`Fetching people data with cache max age: ${maxAgeMs}ms`);
      
      const includeDirectAccess = c.req.query('includeDirectAccess') === 'true';
      console.log('Fetching people data...');
      const people = await peopleService.getAllPeople(maxAgeMs, includeDirectAccess);
      console.log('Got data, returning response');
      
      return c.json({
        success: true,
        count: people.length,
        data: people,
        note: 'Full data may still be loading in background'
      });
    } catch (error: unknown) {
      console.error('Error fetching people:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  return route;
}