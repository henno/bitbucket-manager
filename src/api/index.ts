import { Hono } from 'hono';
import { PeopleService } from '../people-service';
import { sessionsRoute } from './sessions';
import { createWorkspacesRoute } from './workspaces';
import { cacheStatusRoute } from './cache-status';

export function createApiRoutes(peopleService: PeopleService) {
  const api = new Hono();

  // Mount individual routes
  api.route('/sessions', sessionsRoute);
  api.route('/workspaces', createWorkspacesRoute(peopleService));
  api.route('/cache-status', cacheStatusRoute);

  return api;
}