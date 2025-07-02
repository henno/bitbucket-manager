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

  route.get('/people', authMiddleware, async (c) => {
    try {
      const maxAge = c.req.query('maxAge');
      const workspace = c.req.query('workspace'); // Optional: specific workspace to refresh
      const maxAgeMs = maxAge ? parseInt(maxAge) * 1000 : 60 * 60 * 1000;
      
      console.log(`API: /workspaces/people - maxAge: ${maxAge || 'default(3600)'}s, workspace: ${workspace || 'all'}`);
      
      const workspaces = await peopleService.client.getWorkspacesWithAdminAccess(maxAgeMs);
      const workspaceData = new Map();
      
      // Initialize workspace data
      for (const ws of workspaces) {
        // If specific workspace requested, only process that one
        if (workspace && ws.slug !== workspace) continue;
        
        workspaceData.set(ws.slug, {
          slug: ws.slug,
          name: ws.name,
          uuid: ws.uuid,
          people: []
        });
      }
      
      let people;
      
      if (workspace) {
        // Get people data for specific workspace only
        people = await peopleService.getWorkspacePeople(workspace, maxAgeMs);
        
        // Organize people by workspace (should only be the requested workspace)
        people.forEach(person => {
          person.workspaces.forEach(ws => {
            const wsData = workspaceData.get(ws.workspace);
            if (wsData) {
              wsData.people.push({
                name: person.display_name,
                uuid: person.uuid,
                groups: ws.groups,
                repositories: ws.repositories
              });
            }
          });
        });
      } else {
        // Get people data for all workspaces
        people = await peopleService.getAllPeople(maxAgeMs, true);
        
        // Organize people by workspace
        people.forEach(person => {
          person.workspaces.forEach(ws => {
            const wsData = workspaceData.get(ws.workspace);
            if (wsData) {
              wsData.people.push({
                name: person.display_name,
                uuid: person.uuid,
                groups: ws.groups,
                repositories: ws.repositories
              });
            }
          });
        });
      }
      
      const result = Array.from(workspaceData.values())
        .sort((a, b) => a.name.localeCompare(b.name));
      
      return c.json({
        success: true,
        count: result.length,
        data: result,
        refreshedWorkspace: workspace || null
      });
    } catch (error: unknown) {
      console.error('Error fetching workspace people:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  return route;
}