import { Hono } from 'hono';
import { PeopleService } from '../people-service';

export function createPeopleRoute(_peopleService: PeopleService) {
  const route = new Hono();

  route.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>People - Bitbucket Manager</title>
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
            margin: 2px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
            white-space: nowrap;
          }
          .workspace-badge:hover .workspace-part {
            background: #c82333;
          }
          .workspace-badge:hover .group-part {
            background: #a71e2a;
          }
          .workspace-part {
            display: inline-block;
            background: #dc3545;
            color: white;
            padding: 3px 6px;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
          }
          .group-part {
            display: inline-block;
            background: #b02a37;
            color: white;
            padding: 3px 6px;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            margin-left: -1px;
          }
          .repo-badge {
            display: inline-block;
            margin: 2px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
            white-space: nowrap;
          }
          .repo-badge:hover .workspace-part-repo {
            background: #e0a800;
          }
          .repo-badge:hover .repo-part {
            background: #d39e00;
          }
          .workspace-part-repo {
            display: inline-block;
            background: #ffc107;
            color: #212529;
            padding: 3px 6px;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
          }
          .repo-part {
            display: inline-block;
            background: #e6ac00;
            color: #212529;
            padding: 3px 6px;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            margin-left: -1px;
          }
        </style>
      </head>
      <body>
        <!-- Login Form (shown when not authenticated) -->
        <div id="loginForm" class="login-form hidden">
          <h2>Sign In</h2>
          <p>Please sign in to view people management</p>
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
          
          <h1>People Management</h1>
          <p>Manage repository access across all Bitbucket workspaces</p>
          
          <div id="peopleData">
            <p>Loading people data...</p>
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
              const response = await fetch('/api/people', {
                headers: {
                  'Authorization': 'Bearer ' + sessionId
                }
              });

              if (response.ok) {
                showMainContent();
                await loadPeopleData();
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

          async function loadPeopleData() {
            const sessionId = localStorage.getItem('sessionId');
            
            try {
              const response = await fetch('/api/people', {
                headers: {
                  'Authorization': 'Bearer ' + sessionId
                }
              });

              const data = await response.json();

              if (response.ok) {
                displayPeopleData(data.data);
              } else {
                const errorMsg = data.error || 'Failed to load people data';
                document.getElementById('peopleData').innerHTML = 
                  '<div class="error">Error loading people data: ' + errorMsg + '</div>';
              }
            } catch (error) {
              document.getElementById('peopleData').innerHTML = 
                '<div class="error">Error loading people data: ' + error.message + '</div>';
            }
          }

          function displayPeopleData(people) {
            // Sort people by display name
            const sortedPeople = people.sort((a, b) => a.display_name.localeCompare(b.display_name));
            
            document.getElementById('peopleData').innerHTML = \`
              <h3>People (\${sortedPeople.length})</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Workspaces</th>
                    <th>Repositories</th>
                    <th>Total Repositories</th>
                  </tr>
                </thead>
                <tbody>
                  \${sortedPeople.map((person, index) => {
                    // Separate workspace and repository entries
                    const workspaceEntries = [];
                    const repositoryEntries = [];
                    
                    person.workspaces.forEach(w => {
                      // If person has group membership, show workspace/group badges
                      if (w.groups && w.groups.length > 0) {
                        w.groups.forEach(group => {
                          workspaceEntries.push(\`<a href="https://bitbucket.org/\${w.workspace}/workspace/settings/user-directory" target="_blank" class="workspace-badge"><span class="workspace-part">\${w.workspace}</span><span class="group-part">\${group}</span></a>\`);
                        });
                      }
                      
                      // Show individual repositories
                      if (w.repositories && w.repositories.length > 0) {
                        w.repositories.forEach(repo => {
                          repositoryEntries.push(\`<a href="https://bitbucket.org/\${w.workspace}/\${repo.repository}/admin/permissions" target="_blank" class="repo-badge"><span class="workspace-part-repo">\${w.workspace}</span><span class="repo-part">\${repo.repository}</span></a>\`);
                        });
                      }
                    });
                    
                    // Remove duplicates and sort
                    const uniqueWorkspaces = [...new Set(workspaceEntries)].sort((a, b) => a.localeCompare(b));
                    const sortedRepositories = repositoryEntries.sort((a, b) => a.localeCompare(b));
                    
                    const stripeClass = index % 2 === 0 ? 'workspace-even' : 'workspace-odd';
                    
                    return \`
                      <tr class="\${stripeClass}">
                        <td>\${person.display_name}</td>
                        <td>\${uniqueWorkspaces.join(' ')}</td>
                        <td>\${sortedRepositories.join(' ')}</td>
                        <td>\${person.workspaces.reduce((total, w) => total + w.repositories.length, 0)}</td>
                      </tr>
                    \`;
                  }).join('')}
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