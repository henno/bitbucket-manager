import { Hono } from 'hono';
import { PeopleService } from './people-service';
import { createApiRoutes } from './api';
import { createWebRoutes } from './web';

const app = new Hono();

const username = process.env.BITBUCKET_USER;
const token = process.env.BITBUCKET_TOKEN;
const port = parseInt(process.env.PORT || '3000');

console.log('Environment check:', {
  BITBUCKET_USER: !!username,
  BITBUCKET_TOKEN: !!token,
  APP_USER: !!process.env.APP_USER,
  APP_PASS: !!process.env.APP_PASS
});

if (!username || !token) {
  console.error('ERROR: BITBUCKET_USER and BITBUCKET_TOKEN must be set in environment');
  process.exit(1);
}

const peopleService = new PeopleService(username, token);

// Start time for relative timestamps
const startTime = Date.now();
const getRelativeTime = () => `[${((Date.now() - startTime) / 1000).toFixed(3)}s]`;

// Override console.log and console.warn to add timestamps
const originalLog = console.log;
const originalWarn = console.warn;
console.log = (...args) => {
  originalLog(getRelativeTime(), ...args);
};
console.warn = (...args) => {
  originalWarn(getRelativeTime(), ...args);
};

// Mount API routes
const apiRoutes = createApiRoutes(peopleService);
app.route('/api', apiRoutes);

// Mount Web routes
const webRoutes = createWebRoutes(peopleService);
app.route('/', webRoutes);

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  peopleService.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  peopleService.close();
  process.exit(0);
});

console.log(`Starting server on http://localhost:${port}`);

// Start the server directly instead of exporting
Bun.serve({
  port,
  fetch: app.fetch,
  idleTimeout: 120, // Increase timeout to 2 minutes for user removal operations
});
