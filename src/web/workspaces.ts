import { Hono } from 'hono';
import { PeopleService } from '../people-service';

export function createWorkspacesRoute(_peopleService: PeopleService) {
  const route = new Hono();

  route.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspaces - Bitbucket Manager</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container { 
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .login-form {
            max-width: 400px;
            margin: 50px auto;
            padding: 30px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
          }
          input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
          }
          button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
          }
          button:hover {
            background: #0056b3;
          }
          .error {
            color: #dc3545;
            margin-top: 10px;
            padding: 10px;
            background: #f8d7da;
            border-radius: 4px;
          }
          .loading {
            text-align: center;
            padding: 50px;
          }
          .hidden {
            display: none;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background: #f8f9fa;
            font-weight: 600;
          }
          .repos-count {
            color: #28a745;
            font-weight: 500;
          }
          .nav-links {
            margin-bottom: 20px;
          }
          .nav-links a {
            color: #007bff;
            text-decoration: none;
            margin-right: 20px;
          }
          .nav-links a:hover {
            text-decoration: underline;
          }
          .workspace-badge {
            display: inline-block;
            background: #dc3545;
            color: white;
            padding: 3px 8px;
            border-radius: 4px;
            margin: 2px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
          }
          .workspace-badge:hover {
            background: #c82333;
            color: white;
          }
          .repo-badge {
            display: inline-block;
            background: #ffc107;
            color: #212529;
            padding: 3px 8px;
            border-radius: 4px;
            margin: 2px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
          }
          .repo-badge:hover {
            background: #e0a800;
            color: #212529;
          }
        </style>
      </head>
      <body>
        <!-- Login Form (shown when not authenticated) -->
        <div id="loginForm" class="login-form hidden">
          <h2>Sign In</h2>
          <p>Please sign in to view workspaces</p>
          <form id="loginFormElement">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" id="loginButton">Sign In</button>
            <div id="loginError" class="error hidden"></div>
          </form>
        </div>

        <!-- Loading State -->
        <div id="loadingState" class="loading">
          <p>Loading...</p>
        </div>

        <!-- Main Content (shown when authenticated) -->
        <div id="mainContent" class="container hidden">
          <div class="nav-links">
            <a href="/">Home</a>
            <a href="/people">People</a>
            <a href="/workspaces">Workspaces</a>
          </div>
          
          <h1>Workspace Management</h1>
          <p>View people and their access across all Bitbucket workspaces</p>
          
          <div id="workspacesData">
            <p>Loading workspaces data...</p>
          </div>
        </div>

        <script>
          // Check authentication status and show appropriate content
          async function checkAuth() {
            const sessionId = localStorage.getItem('sessionId');
            
            if (!sessionId) {
              showLoginForm();
              return false;
            }

            try {
              // Test the session by making an API call
              const response = await fetch('/api/workspaces', {
                headers: {
                  'Authorization': 'Bearer ' + sessionId
                }
              });

              if (response.ok) {
                showMainContent();
                await loadWorkspacesData();
                return true;
              } else {
                // Session invalid, remove it
                localStorage.removeItem('sessionId');
                showLoginForm();
                return false;
              }
            } catch (error) {
              console.error('Auth check failed:', error);
              showLoginForm();
              return false;
            }
          }

          function showLoginForm() {
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('mainContent').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
          }

          function showMainContent() {
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
          }

          async function login(username, password) {
            try {
              const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
              });

              const data = await response.json();

              if (response.ok) {
                localStorage.setItem('sessionId', data.sessionId);
                // Refresh the page to show content
                window.location.reload();
              } else {
                document.getElementById('loginError').textContent = data.error || 'Login failed';
                document.getElementById('loginError').classList.remove('hidden');
              }
            } catch (error) {
              document.getElementById('loginError').textContent = error.message;
              document.getElementById('loginError').classList.remove('hidden');
            }
          }

          async function loadWorkspacesData() {
            const sessionId = localStorage.getItem('sessionId');
            
            try {
              // Load both people and workspaces data
              const [peopleResponse, workspacesResponse] = await Promise.all([
                fetch('/api/people', {
                  headers: { 'Authorization': 'Bearer ' + sessionId }
                }),
                fetch('/api/workspaces', {
                  headers: { 'Authorization': 'Bearer ' + sessionId }
                })
              ]);

              const peopleData = await peopleResponse.json();
              const workspacesData = await workspacesResponse.json();

              if (peopleResponse.ok && workspacesResponse.ok) {
                displayWorkspacesData(peopleData.data, workspacesData.data);
              } else {
                document.getElementById('workspacesData').innerHTML = 
                  '<div class="error">Error loading workspaces data: Failed to load workspace data</div>';
              }
            } catch (error) {
              document.getElementById('workspacesData').innerHTML = 
                '<div class="error">Error loading workspaces data: ' + error.message + '</div>';
            }
          }

          function displayWorkspacesData(peopleData, workspaces) {
            // Create a map of workspace -> people
            const workspaceMap = new Map();
            
            // Initialize all workspaces
            workspaces.forEach(workspace => {
              workspaceMap.set(workspace.slug, {
                name: workspace.name,
                slug: workspace.slug,
                members: []
              });
            });

            // Add people to their workspaces
            peopleData.forEach(person => {
              person.workspaces.forEach(workspace => {
                const workspaceData = workspaceMap.get(workspace.workspace);
                if (workspaceData) {
                  workspaceData.members.push({
                    name: person.display_name,
                    uuid: person.uuid,
                    groups: workspace.groups,
                    repoCount: workspace.repositories.length,
                    repositories: workspace.repositories
                  });
                }
              });
            });

            // Sort workspaces by name
            const sortedWorkspaces = Array.from(workspaceMap.values())
              .sort((a, b) => a.name.localeCompare(b.name));

            // Flatten data into workspace-person pairs for table format
            const tableRows = [];
            sortedWorkspaces.forEach(workspace => {
              if (workspace.members.length > 0) {
                // Sort people within each workspace
                const sortedMembers = workspace.members.sort((a, b) => a.name.localeCompare(b.name));
                
                sortedMembers.forEach(memberData => {
                  const accessInfo = memberData.groups.length > 0 
                    ? memberData.groups.map(group => \`<a href="https://bitbucket.org/\${workspace.slug}/workspace/settings/user-directory" target="_blank" class="workspace-badge">\${group}</a>\`).join(' ')
                    : memberData.repositories.map(repo => \`<a href="https://bitbucket.org/\${workspace.slug}/\${repo.repository}/admin/permissions" target="_blank" class="repo-badge">\${repo.repository}</a>\`).join(' ');
                  
                  tableRows.push({
                    workspace: workspace.name,
                    person: memberData.name,
                    access: accessInfo,
                    repoCount: memberData['repoCount']
                  });
                });
              }
            });

            document.getElementById('workspacesData').innerHTML = \`
              <h3>Workspaces (\${sortedWorkspaces.length} workspaces, \${tableRows.length} access entries)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Workspace</th>
                    <th>Person</th>
                    <th>Access</th>
                    <th>Repositories</th>
                  </tr>
                </thead>
                <tbody>
                  \${tableRows.map(row => \`
                    <tr>
                      <td>\${row['workspace']}</td>
                      <td>\${row['person']}</td>
                      <td>\${row['access']}</td>
                      <td>\${row['repoCount']}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            \`;
          }

          // Handle login form submission
          document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const usernameEl = document.getElementById('username');
            const passwordEl = document.getElementById('password');
            const username = usernameEl ? usernameEl['value'] : '';
            const password = passwordEl ? passwordEl['value'] : '';
            
            const button = document.getElementById('loginButton');
            button.textContent = 'Signing in...';
            button.disabled = true;
            
            await login(username, password);
            
            button.textContent = 'Sign In';
            button.disabled = false;
          });

          // Check auth when page loads
          checkAuth();
        </script>
      </body>
      </html>
    `);
  });

  return route;
}