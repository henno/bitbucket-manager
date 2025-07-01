import { Hono } from 'hono';
import { authMiddleware } from '../auth';
import { PeopleService } from '../people-service';

export function createWorkspacesRoute(peopleService: PeopleService) {
  const route = new Hono();

  route.get('/', authMiddleware, async (c) => {
    try {
      const maxAge = c.req.query('maxAge');
      const maxAgeMs = maxAge ? parseInt(maxAge) * 1000 : 60 * 60 * 1000;
      
      const workspaces = await peopleService.client.getWorkspacesWithAdminAccess(maxAgeMs);
      
      return c.json({
        success: true,
        count: workspaces.length,
        data: workspaces.map(w => ({
          slug: w.slug,
          name: w.name,
          uuid: w.uuid
        }))
      });
    } catch (error: unknown) {
      console.error('Error fetching workspaces:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  return route;
}