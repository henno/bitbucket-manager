import { Hono } from 'hono';
import { createWorkspacesRoute } from './workspaces';
import { PeopleService } from '../people-service';

export function createWebRoutes(peopleService: PeopleService) {
  const web = new Hono();

  // Redirect root to workspaces
  web.get('/', (c) => {
    return c.redirect('/workspaces');
  });

  // Mount workspaces route
  web.route('/workspaces', createWorkspacesRoute(peopleService));

  return web;
}