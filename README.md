# Bitbucket People Manager

A REST API and web interface for managing Bitbucket repository access across all workspaces where you have admin privileges. Built with Bun runtime and TypeScript.

## Features

- **People Management**: View all users and their repository access across workspaces
- **Workspace Management**: Browse workspaces and see which people have access
- **Direct Access Detection**: Find users with direct repository access (not via groups)
- **Visual Interface**: Color-coded badges for workspace vs repository access
- **Persistent Caching**: SQLite-based caching for improved performance
- **Authentication**: Session-based login system

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Bitbucket Cloud account with admin access to workspaces
- Bitbucket App Password (see setup below)

## Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd bb2
   bun install
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** in `.env`:
   ```env
   BITBUCKET_USER=your-bitbucket-username
   BITBUCKET_TOKEN=your-app-password
   APP_USER=admin
   APP_PASS=your-hashed-password
   PORT=3000
   ```

4. **Generate Bitbucket App Password**:
   - Go to [Bitbucket Settings > App passwords](https://bitbucket.org/account/settings/app-passwords/)
   - Create new app password with these permissions:
     - Account: Read
     - Workspace membership: Read
     - Projects: Read
     - Repositories: Read, Admin
   - Copy the generated password to `BITBUCKET_TOKEN`

5. **Generate APP_PASS hash**:
   ```bash
   # Run this command to generate a SHA256 hash for your password
   echo -n "your-password" | openssl dgst -sha256
   ```
   Copy the hash (without the "SHA256(stdin)= " prefix) to `APP_PASS` in your `.env` file.

6. **Start the server**:
   ```bash
   bun run src/index.ts
   ```

## Usage

### Web Interface

Navigate to `http://localhost:3000` in your browser:

- **Home** (`/`): API documentation and links
- **People** (`/people`): Table view of all users and their access
- **Workspaces** (`/workspaces`): Table view organized by workspace

### Authentication

1. Click on any protected page (People or Workspaces)
2. Login with your configured `APP_USER` and password
3. Session will be maintained across browser tabs

### API Endpoints

All API endpoints require authentication via `Authorization: Bearer <sessionId>` header.

- `POST /api/sessions` - Login and get session ID
- `GET /api/people` - Get all people with repository access
- `GET /api/workspaces` - Get all workspaces
- `GET /health` - Health check (no auth required)

### Query Parameters

- `maxAge`: Cache max age in seconds (default: 3600)
- `includeDirectAccess`: Include cross-workspace direct access detection (default: false)

## Badge System

- **Red badges**: Workspace access (via groups) - links to user directory
- **Yellow badges**: Direct repository access - links to repository permissions

## Architecture

- **Bun**: Runtime and package manager
- **Hono**: Web framework
- **SQLite**: Persistent caching and session storage
- **TypeScript**: Type safety
- **Bitbucket API**: v1.0 and v2.0 endpoints

## Development

```bash
# Start development server
bun run src/index.ts

# The server will restart automatically on file changes
```

## Cache Management

The application uses SQLite for persistent caching:
- API responses are cached with configurable TTL
- Cache survives server restarts
- Database file: `database.sqlite` (auto-created)

## Troubleshooting

1. **Authentication fails**: Verify your Bitbucket app password has correct permissions
2. **No workspaces found**: Ensure you have admin access to at least one workspace
3. **Database errors**: Delete `database.sqlite` to reset cache
4. **Login issues**: Regenerate your `APP_PASS` hash using the command above