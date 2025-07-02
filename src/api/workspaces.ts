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

  // Remove user from specific workspace resources
  route.delete('/:workspaceSlug/users/:userName', authMiddleware, async (c) => {
    try {
      const { workspaceSlug, userName } = c.req.param();
      const removeTargets = await c.req.json();

      if (!userName) {
        return c.json({ error: 'User name is required' }, 400);
      }

      console.log(`API: Removing user "${userName}" from specific resources in workspace "${workspaceSlug}"`, removeTargets);

      // Use UUID if provided for faster, more robust removal
      const userIdentifier = removeTargets.userUuid || userName;
      const isUuid = !!removeTargets.userUuid;
      
      if (isUuid) {
        console.log(`Using provided UUID for faster removal: ${userIdentifier}`);
      }

      const result = await peopleService.client.removeUserFromSpecificResources(
        workspaceSlug, 
        userIdentifier, 
        removeTargets,
        isUuid
      );

      // Selectively invalidate cache based on what was actually removed
      if (result.removedFrom.length > 0) {
        console.log(`Selectively invalidating cache for workspace ${workspaceSlug} after user removal`);
        
        // Extract specific resources that were modified from the removal result
        const cacheTargets: { groups?: string[], repositories?: string[], projects?: string[] } = {};
        
        result.removedFrom.forEach(removal => {
          if (removal.startsWith('group:')) {
            const groupSlug = removal.replace('group:', '');
            if (!cacheTargets.groups) cacheTargets.groups = [];
            cacheTargets.groups.push(groupSlug);
          } else if (removal.startsWith('repository:')) {
            const repoName = removal.replace('repository:', '').replace('(direct)', '');
            if (!cacheTargets.repositories) cacheTargets.repositories = [];
            cacheTargets.repositories.push(repoName);
          } else if (removal.startsWith('project:')) {
            const projectKey = removal.replace('project:', '');
            if (!cacheTargets.projects) cacheTargets.projects = [];
            cacheTargets.projects.push(projectKey);
          }
        });
        
        // Use selective cache invalidation if we have specific targets, otherwise invalidate all
        if (Object.keys(cacheTargets).length > 0) {
          await peopleService.client.invalidateWorkspaceCache(workspaceSlug, cacheTargets);
        } else {
          await peopleService.client.invalidateWorkspaceCache(workspaceSlug);
        }
      }

      if (result.errors.length > 0) {
        console.warn('User removal completed with some errors:', result.errors);
        
        if (result.removedFrom.length > 0) {
          return c.json({
            success: true,
            message: `User "${userName}" partially removed. Removed from: ${result.removedFrom.join(', ')}`,
            removedFrom: result.removedFrom,
            errors: result.errors
          });
        } else {
          return c.json({
            success: false,
            error: `Failed to remove user "${userName}": ${result.errors.join('; ')}`,
            errors: result.errors
          }, 500);
        }
      }

      return c.json({
        success: true,
        message: `User "${userName}" has been removed from specified resources`,
        removedFrom: result.removedFrom
      });

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error removing user from workspace:', error);
      return c.json({
        success: false,
        error: `Failed to remove user: ${message}`
      }, 500);
    }
  });

  return route;
}