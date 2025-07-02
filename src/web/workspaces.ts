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
            border: 1px solid #adb5bd;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #adb5bd;
            border-right: 1px solid #adb5bd;
          }
          th:last-child, td:last-child {
            border-right: none;
          }
          .workspace-name {
            font-weight: bold;
            position: relative;
            padding-right: 25px;
          }
          .workspace-refresh {
            position: absolute;
            top: 4px;
            right: 4px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 3px;
            opacity: 0.6;
            font-size: 14px;
            color: #6c757d;
            z-index: 10;
            width: auto;
            height: auto;
            line-height: 1;
          }
          .workspace-refresh:hover {
            opacity: 1;
            background: rgba(0,0,0,0.1);
          }
          .workspace-refresh.refreshing {
            opacity: 0.5;
            pointer-events: none;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          th {
            background: #dee2e6;
            font-weight: 600;
          }
          tr.workspace-even {
            background-color: #e9ecef;
          }
          tr.workspace-odd {
            background-color: #f8f9fa;
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
              // Use 1 hour cache duration for initial page load
              console.log('Loading workspaces data with 1h cache...');
              const response = await fetch('/api/workspaces/people?maxAge=3600', {
                headers: { 'Authorization': 'Bearer ' + sessionId }
              });

              const data = await response.json();

              if (response.ok) {
                displayWorkspacesData(data.data);
              } else {
                document.getElementById('workspacesData').innerHTML = 
                  '<div class="error">Error loading workspaces data: ' + (data.error || 'Failed to load workspace data') + '</div>';
              }
            } catch (error) {
              document.getElementById('workspacesData').innerHTML = 
                '<div class="error">Error loading workspaces data: ' + error.message + '</div>';
            }
          }

          function displayWorkspacesData(workspaces) {
            // Data is already organized by workspaces from the API
            const sortedWorkspaces = workspaces.sort((a, b) => a.name.localeCompare(b.name));

            // Flatten data into workspace-person pairs for table format
            const tableRows = [];
            sortedWorkspaces.forEach(workspace => {
              if (workspace.people.length > 0) {
                // Sort people within each workspace
                const sortedMembers = workspace.people.sort((a, b) => a.name.localeCompare(b.name));
                
                sortedMembers.forEach(memberData => {
                  if (memberData.groups.length > 0) {
                    // Create separate row for each group
                    memberData.groups.forEach(group => {
                      // Get unique repositories for this group
                      const uniqueRepos = [...new Set(memberData.repositories.map(repo => repo.repository))];
                      const groupRepos = uniqueRepos.map(repoName => ({ repository: repoName }));
                      
                      tableRows.push({
                        workspace: workspace.name,
                        workspaceSlug: workspace.slug,
                        person: memberData.name,
                        access: \`<a href="https://bitbucket.org/\${workspace.slug}/workspace/settings/user-directory" target="_blank" class="workspace-badge">\${group}</a>\`,
                        repositories: groupRepos.map(repo => \`<a href="https://bitbucket.org/\${workspace.slug}/\${repo.repository}" target="_blank" class="repo-badge">\${repo.repository}</a>\`).join(' ')
                      });
                    });
                  } else {
                    // Create separate row for each direct repository access
                    memberData.repositories.forEach(repo => {
                      tableRows.push({
                        workspace: workspace.name,
                        workspaceSlug: workspace.slug,
                        person: memberData.name,
                        access: '',
                        repositories: \`<a href="https://bitbucket.org/\${workspace.slug}/\${repo.repository}/admin/permissions" target="_blank" class="repo-badge">\${repo.repository}</a>\`
                      });
                    });
                  }
                });
              }
            });

            // Calculate row spans for workspace and person columns
            const rowsWithSpans = [];
            let currentWorkspace = '';
            let currentPerson = '';
            let workspaceSpan = 0;
            let personSpan = 0;
            let workspaceStartIndex = 0;
            let personStartIndex = 0;
            let workspaceIndex = 0;

            tableRows.forEach((row, index) => {
              const workspaceChanged = row['workspace'] !== currentWorkspace;
              const personChanged = row['person'] !== currentPerson || workspaceChanged;

              // Add rowspan info to previous workspace rows
              if (workspaceChanged && workspaceSpan > 0) {
                rowsWithSpans[workspaceStartIndex].workspaceSpan = workspaceSpan;
              }
              
              // Add rowspan info to previous person rows  
              if (personChanged && personSpan > 0) {
                rowsWithSpans[personStartIndex].personSpan = personSpan;
              }

              if (workspaceChanged) {
                workspaceIndex++;
              }

              rowsWithSpans.push({
                ...row,
                showWorkspace: workspaceChanged,
                showPerson: personChanged,
                workspaceSpan: 1,
                personSpan: 1,
                workspaceStripe: workspaceIndex % 2 === 0 ? 'workspace-even' : 'workspace-odd'
              });

              if (workspaceChanged) {
                currentWorkspace = row['workspace'];
                workspaceSpan = 1;
                workspaceStartIndex = index;
              } else {
                workspaceSpan++;
              }

              if (personChanged) {
                currentPerson = row['person'];
                personSpan = 1;
                personStartIndex = index;
              } else {
                personSpan++;
              }
            });

            // Handle last group
            if (workspaceSpan > 0) {
              rowsWithSpans[workspaceStartIndex].workspaceSpan = workspaceSpan;
            }
            if (personSpan > 0) {
              rowsWithSpans[personStartIndex].personSpan = personSpan;
            }

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
                  \${rowsWithSpans.map((row) => \`
                    <tr class="\${row['workspaceStripe']}">
                      \${row['showWorkspace'] ? \`<td rowspan="\${row['workspaceSpan']}" class="workspace-name">\${row['workspace']}<button class="workspace-refresh" onclick="refreshWorkspace('\${row['workspaceSlug']}')" title="Refresh workspace data">↻</button></td>\` : ''}
                      \${row['showPerson'] ? \`<td rowspan="\${row['personSpan']}">\${row['person']}</td>\` : ''}
                      <td>\${row['access']}</td>
                      <td>\${row['repositories']}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            \`;
          }

          async function refreshWorkspace(workspaceSlug) {
            const sessionId = localStorage.getItem('sessionId');
            const refreshButton = document.querySelector(\`button[onclick="refreshWorkspace('\${workspaceSlug}')"]\`);
            
            if (!refreshButton) return;
            
            // Show refreshing state
            refreshButton.classList.add('refreshing');
            refreshButton.innerHTML = '⟳';
            
            try {
              // Refresh specific workspace with cache bypass
              const response = await fetch(\`/api/workspaces/people?maxAge=0&workspace=\${encodeURIComponent(workspaceSlug)}\`, {
                headers: {
                  'Authorization': 'Bearer ' + sessionId
                }
              });

              if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.length > 0) {
                  // Update only the refreshed workspace data
                  await updateWorkspaceInTable(data.data[0]);
                } else {
                  // If no data returned, reload all data
                  await loadWorkspacesData();
                }
              } else {
                return Promise.reject(new Error('Failed to refresh workspace data'));
              }
            } catch (error) {
              console.error('Error refreshing workspace:', error);
              alert('Failed to refresh workspace data. Reloading all data...');
              await loadWorkspacesData();
            } finally {
              // Reset button state
              refreshButton.classList.remove('refreshing');
              refreshButton.innerHTML = '↻';
            }
          }

          async function updateWorkspaceInTable(_updatedWorkspace) {
            // For now, just reload all data since partial updates are complex with rowspan
            // In the future, you could implement more sophisticated partial updates
            await loadWorkspacesData();
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