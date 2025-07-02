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
            margin: 2px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
            white-space: nowrap;
          }
          .workspace-badge:hover .group-workspace-part {
            background: #004085;
          }
          .workspace-badge:hover .group-part {
            background: #003266;
          }
          .group-workspace-part {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 3px 6px;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
          }
          .group-part {
            display: inline-block;
            background: #0056b3;
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
          .repo-badge.admin .workspace-part-repo {
            background: #dc3545;
            color: white;
          }
          .repo-badge.admin .repo-part {
            background: #b02a37;
            color: white;
          }
          .repo-badge.admin:hover .workspace-part-repo {
            background: #c82333;
          }
          .repo-badge.admin:hover .repo-part {
            background: #a71e2a;
          }
          .repo-badge.write .workspace-part-repo {
            background: #ffc107;
            color: #212529;
          }
          .repo-badge.write .repo-part {
            background: #e6ac00;
            color: #212529;
          }
          .repo-badge.write:hover .workspace-part-repo {
            background: #e0a800;
          }
          .repo-badge.write:hover .repo-part {
            background: #d39e00;
          }
          .repo-badge.read .workspace-part-repo {
            background: #28a745;
            color: white;
          }
          .repo-badge.read .repo-part {
            background: #1e7e34;
            color: white;
          }
          .repo-badge.read:hover .workspace-part-repo {
            background: #218838;
          }
          .repo-badge.read:hover .repo-part {
            background: #155724;
          }
          .project-badge {
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
          .project-badge:hover .project-workspace-part {
            background: #5a2d91;
          }
          .project-badge:hover .project-key-part {
            background: #4c2678;
          }
          .project-workspace-part {
            display: inline-block;
            background: #6f42c1;
            color: white;
            padding: 3px 6px;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
          }
          .project-key-part {
            display: inline-block;
            background: #5a2d91;
            color: white;
            padding: 3px 6px;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            margin-left: -1px;
          }
          .direct-badge {
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
          .direct-badge:hover .direct-repo-part {
            background: #17a2b8;
          }
          .direct-badge:hover .direct-name-part {
            background: #138496;
          }
          .direct-repo-part {
            display: inline-block;
            background: #20c997;
            color: white;
            padding: 3px 6px;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
          }
          .direct-name-part {
            display: inline-block;
            background: #17a2b8;
            color: white;
            padding: 3px 6px;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            margin-left: -1px;
          }
          .no-access {
            color: #6c757d;
            font-style: italic;
            font-size: 0.875rem;
          }
          .person-badge {
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
          .person-badge:hover .person-name-part {
            background: #5a6268;
          }
          .person-badge:hover .person-remove-x {
            background: #4e555b;
          }
          .person-name-part {
            display: inline-block;
            background: #6c757d;
            color: white;
            padding: 3px 6px;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
          }
          .person-remove-x {
            display: inline-block;
            background: #5a6268;
            color: white;
            padding: 3px 6px;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            margin-left: -1px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          .modal-backdrop.hidden {
            display: none;
          }
          .modal {
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }
          .modal h3 {
            margin: 0 0 16px 0;
            color: #dc3545;
          }
          .modal p {
            margin: 0 0 20px 0;
            line-height: 1.5;
          }
          .modal-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }
          .modal-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          }
          .modal-btn.cancel {
            background: #6c757d;
            color: white;
          }
          .modal-btn.cancel:hover {
            background: #5a6268;
          }
          .modal-btn.remove {
            background: #dc3545;
            color: white;
          }
          .modal-btn.remove:hover {
            background: #c82333;
          }
          .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            max-width: 300px;
            word-wrap: break-word;
          }
          .toast.success {
            background: #28a745;
          }
          .toast.error {
            background: #dc3545;
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
            <a href="/people">People</a>
            <a href="/workspaces">Workspaces</a>
          </div>
          
          <h1>Workspace Management</h1>
          <p>View people and their access across all Bitbucket workspaces</p>
          
          <div id="workspacesData">
            <p>Loading workspaces data...</p>
          </div>
        </div>

        <!-- Confirmation Modal -->
        <div id="removeModal" class="modal-backdrop hidden">
          <div class="modal">
            <h3>Remove User from Workspace</h3>
            <p id="removeModalText">Are you sure you want to remove this user from the workspace and revoke all permissions?</p>
            <div class="modal-buttons">
              <button class="modal-btn cancel" onclick="hideRemoveModal()">Cancel</button>
              <button class="modal-btn remove" onclick="confirmRemoveUser()">Remove</button>
            </div>
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
                  let memberHasAnyRows = false;
                  
                  if (memberData.groups.length > 0) {
                    // Create separate row for each group
                    memberData.groups.forEach(group => {
                      // Get repositories that this person accesses through THIS SPECIFIC GROUP
                      const groupRepos = memberData.repositories.filter(repo => 
                        repo.access_type === 'GROUP' && repo.group === group
                      );
                      
                      if (groupRepos.length > 0) {
                        tableRows.push({
                          workspace: workspace.name,
                          workspaceSlug: workspace.slug,
                          person: memberData.name,
                          personUuid: memberData.uuid,
                          access: \`<a href="https://bitbucket.org/\${workspace.slug}/workspace/settings/user-directory" target="_blank" class="workspace-badge"><span class="group-workspace-part">group</span><span class="group-part">\${group}</span></a>\`,
                          repositories: groupRepos.map(repo => \`<a href="https://bitbucket.org/\${workspace.slug}/\${repo.repository}" target="_blank" class="repo-badge \${repo.permission || 'read'}"><span class="workspace-part-repo">\${workspace.slug}</span><span class="repo-part">\${repo.repository}</span></a>\`).join(' '),
                          removeTarget: {
                            groups: [group]
                          }
                        });
                        memberHasAnyRows = true;
                      }
                    });
                  }
                  
                  // Add PROJECT-level access
                  const projectRepos = memberData.repositories.filter(repo => 
                    repo.access_type === 'PROJECT'
                  );
                  if (projectRepos.length > 0) {
                    // Group project repos by their project key
                    const projectGroups = {};
                    projectRepos.forEach(repo => {
                      if (!projectGroups[repo.project]) {
                        projectGroups[repo.project] = [];
                      }
                      projectGroups[repo.project].push(repo);
                    });
                    
                    // Create separate row for each project
                    Object.entries(projectGroups).forEach(([projectKey, repos]) => {
                      tableRows.push({
                        workspace: workspace.name,
                        workspaceSlug: workspace.slug,
                        person: memberData.name,
                        personUuid: memberData.uuid,
                        access: \`<span class="project-badge"><span class="project-workspace-part">project</span><span class="project-key-part">\${projectKey}</span></span>\`,
                        repositories: repos.map(repo => \`<a href="https://bitbucket.org/\${workspace.slug}/\${repo.repository}" target="_blank" class="repo-badge \${repo.permission || 'read'}"><span class="workspace-part-repo">\${workspace.slug}</span><span class="repo-part">\${repo.repository}</span></a>\`).join(' '),
                        removeTarget: {
                          projects: [projectKey]
                        }
                      });
                    });
                    memberHasAnyRows = true;
                  }

                  // Handle direct repository access
                  const directRepos = memberData.repositories.filter(repo =>
                    repo.access_type === 'DIRECT'
                  );
                  if (directRepos.length > 0) {
                    tableRows.push({
                      workspace: workspace.name,
                      workspaceSlug: workspace.slug,
                      person: memberData.name,
                      personUuid: memberData.uuid,
                      access: directRepos.map(repo => \`<span class="direct-badge"><span class="direct-repo-part">repo</span><span class="direct-name-part">\${repo.repository}</span></span>\`).join(' '),
                      repositories: directRepos.map(repo => \`<a href="https://bitbucket.org/\${workspace.slug}/\${repo.repository}/admin/permissions" target="_blank" class="repo-badge \${repo.permission || 'read'}"><span class="workspace-part-repo">\${workspace.slug}</span><span class="repo-part">\${repo.repository}</span></a>\`).join(' '),
                      removeTarget: {
                        repositories: directRepos.map(repo => repo.repository)
                      }
                    });
                    memberHasAnyRows = true;
                  }

                  // If member has no repository access at all, still show them with their groups
                  if (!memberHasAnyRows && memberData.groups.length > 0) {
                    // Show first group (or all groups) even if they provide no repository access
                    memberData.groups.forEach(group => {
                      tableRows.push({
                        workspace: workspace.name,
                        workspaceSlug: workspace.slug,
                        person: memberData.name,
                        personUuid: memberData.uuid,
                        access: \`<a href="https://bitbucket.org/\${workspace.slug}/workspace/settings/user-directory" target="_blank" class="workspace-badge"><span class="group-workspace-part">group</span><span class="group-part">\${group}</span></a>\`,
                        repositories: '', // No repositories
                        removeTarget: {
                          groups: [group]
                        }
                      });
                    });
                  } else if (!memberHasAnyRows) {
                    // Member has no groups and no repository access - still show them
                    tableRows.push({
                      workspace: workspace.name,
                      workspaceSlug: workspace.slug,
                      person: memberData.name,
                      personUuid: memberData.uuid,
                      access: \`<span class="no-access">No access</span>\`,
                      repositories: '', // No repositories
                      removeTarget: {
                        removeAll: true // Fallback for users with no specific access
                      }
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
                      \${row['showPerson'] ? \`<td rowspan="\${row['personSpan']}"><div class="person-badge"><span class="person-name-part">\${row['person']}</span><span class="person-remove-x" data-remove-target="\${btoa(JSON.stringify(row['removeTarget']))}" data-user-uuid="\${row['personUuid']}" onclick="showRemoveModal('\${row['person']}', '\${row['workspaceSlug']}', 'specific', this)" title="Remove \${row['person']} from this specific access">×</span></div></td>\` : ''}
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

          // Modal and user removal functionality
          let currentRemovalUser = null;
          let currentRemovalWorkspace = null;
          let currentRemovalMode = null;
          let currentRemovalTarget = null;
          let currentRemovalUserUuid = null;

          function showRemoveModal(userName, workspaceSlug, mode = 'all', element = null) {
            currentRemovalUser = userName;
            currentRemovalWorkspace = workspaceSlug;
            currentRemovalMode = mode;
            
            // Extract user UUID from the element
            if (element && element.dataset.userUuid) {
              currentRemovalUserUuid = element.dataset.userUuid;
            } else {
              currentRemovalUserUuid = null;
            }
            
            let removeTarget = null;
            if (mode === 'specific' && element && element.dataset.removeTarget) {
              try {
                removeTarget = JSON.parse(atob(element.dataset.removeTarget));
                currentRemovalTarget = removeTarget;
              } catch (error) {
                console.error('Failed to parse removal target:', error);
                removeTarget = null;
                currentRemovalTarget = null;
              }
            }
            
            let message;
            if (mode === 'all') {
              message = \`Remove \${userName} from this workspace and revoke all permissions?\`;
            } else if (mode === 'specific' && removeTarget) {
              if (removeTarget.groups) {
                message = \`Remove \${userName} from group(s): \${removeTarget.groups.join(', ')}?\`;
              } else if (removeTarget.repositories) {
                message = \`Remove \${userName}'s direct access to repository(ies): \${removeTarget.repositories.join(', ')}?\`;
              } else if (removeTarget.projects) {
                message = \`Remove \${userName}'s access to project(s): \${removeTarget.projects.join(', ')}?\`;
              } else {
                message = \`Remove \${userName}'s access?\`;
              }
            } else {
              message = \`Remove \${userName}'s access to this specific resource?\`;
            }
            
            document.getElementById('removeModalText').textContent = message;
            document.getElementById('removeModal').classList.remove('hidden');
          }

          function hideRemoveModal() {
            currentRemovalUser = null;
            currentRemovalWorkspace = null;
            currentRemovalMode = null;
            currentRemovalTarget = null;
            currentRemovalUserUuid = null;
            document.getElementById('removeModal').classList.add('hidden');
          }

          async function confirmRemoveUser() {
            if (!currentRemovalUser || !currentRemovalWorkspace) {
              return;
            }

            const sessionId = localStorage.getItem('sessionId');
            
            // Update modal to show progress
            const removeButton = document.querySelector('.modal-btn.remove');
            const originalText = removeButton.textContent;
            removeButton.textContent = 'Removing...';
            removeButton.disabled = true;
            
            try {
              // Prepare removal targets based on mode
              let removeTargets;
              if (currentRemovalMode === 'all') {
                removeTargets = { removeAll: true };
              } else if (currentRemovalMode === 'specific' && currentRemovalTarget) {
                removeTargets = currentRemovalTarget;
              } else {
                removeTargets = { removeAll: true }; // Fallback
              }
              
              // Add user UUID to the request body to avoid backend name resolution
              if (currentRemovalUserUuid) {
                removeTargets.userUuid = currentRemovalUserUuid;
              }
              
              // Use longer timeout for user removal operations
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes
              
              const response = await fetch(\`/api/workspaces/\${currentRemovalWorkspace}/users/\${encodeURIComponent(currentRemovalUser)}\`, {
                method: 'DELETE',
                headers: {
                  'Authorization': 'Bearer ' + sessionId,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(removeTargets),
                signal: controller.signal
              });

              clearTimeout(timeoutId);

              if (response.ok) {
                const result = await response.json();
                showToast(result.message || \`\${currentRemovalUser} has been removed from the workspace\`, 'success');
                hideRemoveModal();
                // Backend invalidated cache for affected workspace, so reload page
                // Only the affected workspace will fetch fresh data, others use cache
                setTimeout(() => location.reload(), 1000); // Small delay to show toast
              } else {
                const error = await response.json();
                showToast(error.error || 'Failed to remove user from workspace', 'error');
                hideRemoveModal(); // Hide modal even on error
              }
            } catch (error) {
              let message = 'Error removing user: ' + error.message;
              if (error.name === 'AbortError') {
                message = 'User removal is taking longer than expected. The operation may still complete in the background.';
              }
              showToast(message, 'error');
              hideRemoveModal(); // Hide modal even on timeout
            } finally {
              // Reset button state
              removeButton.textContent = originalText;
              removeButton.disabled = false;
            }
          }

          function showToast(message, type = 'success') {
            // Remove any existing toasts
            const existingToast = document.querySelector('.toast');
            if (existingToast) {
              existingToast.remove();
            }

            const toast = document.createElement('div');
            toast.className = \`toast \${type}\`;
            toast.textContent = message;
            document.body.appendChild(toast);

            // Auto-remove after 5 seconds
            setTimeout(() => {
              if (toast.parentNode) {
                toast.remove();
              }
            }, 5000);
          }

          // Close modal when clicking outside
          document.addEventListener('DOMContentLoaded', () => {
            const modal = document.getElementById('removeModal');
            if (modal) {
              modal.addEventListener('click', (e) => {
                if (e.target.id === 'removeModal') {
                  hideRemoveModal();
                }
              });
            }
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
