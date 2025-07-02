# Bitbucket People Manager - your single pane of glass for repo access

Keeping Bitbucket tidy shouldn’t feel like spelunking through nested **repos → projects → groups**. Yet every time a teammate left, you had to play hide-and-seek with phantom permissions, hitting seat limits you *swore* were impossible.

**Bitbucket Permission Manager** flips that script:

* **One dashboard, total visibility** – every workspace, repo, project and group laid out in a flat, searchable table.
* **Instant audits** – see *who* can do *what* (and *why*) in seconds.
* **One-click clean-ups** – boot ex-employees or reassign roles without hunting through Bitbucket’s UI.
* **Seat-saver** – reclaim paid user slots before they drain your budget.

Stop guessing, start managing. Spin it up, connect your workspaces, and take back control of your Bitbucket permissions—100 % oversight, zero hassle.


## Features

- **People Management**: View all users and their repository access across workspaces
- **Workspace Management**: Browse workspaces and see which people have access
- **Direct Access Detection**: Find users with direct repository access (not via groups)
- **Visual Interface**: Color-coded badges for workspace vs repository access
- **Persistent Caching**: SQLite-based caching for improved performance
- **Authentication**: Session-based login system
- **Hide Myself**: Option to hide yourself from tables for cleaner views

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Bitbucket Cloud account with admin access to workspaces
- Bitbucket App Password (see setup below)

## Setup

1. **Generate Bitbucket App Password or API token**:
   - Go to [Bitbucket Settings > App passwords](https://bitbucket.org/account/settings/app-passwords/)
   - Create new app password with these permissions:
      - Account: Read
      - Workspace membership: Read, Admin
      - Projects: Read, Admin
      - Repositories: Read, Admin

2. **Run the interactive setup script**:
   ```bash
   bun setup
   ```
   
   This will guide you through the configuration process:
   - Setting up Bitbucket credentials
   - Creating app login credentials
   - Configuring port settings
   - Enabling the "hide myself" feature (automatically fetches your UUID)

3. **Start the server**:
   ```bash
   bun start # production mode: builds plain js file (dist/index.js) and runs that 
   bun dev  # development mode: watches changes and reloads automatically
   ```

## Usage

### Web Interface

Navigate to `http://localhost:3000` in your browser (or whatever port you set):

- **People** (`/people`): Table view of all users and their access
- **Workspaces** (`/workspaces`): Table view organized by workspace

## Cache Management

The application uses SQLite for persistent caching:
- API responses are cached with configurable TTL
- Cache survives server restarts
- Database file: `database.sqlite` (auto-created)

## Troubleshooting

1. **Authentication fails**: Verify your Bitbucket app password has correct permissions
2. **No workspaces found**: Ensure you have admin access to at least one workspace
3. **Database errors**: Delete `database.sqlite` to reset cache
4. **Login issues**: Regenerate your `APP_PASS` hash using `bun setup`
