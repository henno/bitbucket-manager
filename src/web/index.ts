import { Hono } from 'hono';
import { homeRoute } from './home';
import { createPeopleRoute } from './people';
import { createWorkspacesRoute } from './workspaces';
import { PeopleService } from '../people-service';

export function createWebRoutes(peopleService: PeopleService) {
  const web = new Hono();

  // Mount web routes
  web.route('/', homeRoute);
  web.route('/people', createPeopleRoute(peopleService));
  web.route('/workspaces', createWorkspacesRoute(peopleService));

  return web;
}