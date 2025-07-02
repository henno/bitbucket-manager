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
            min-width: 768px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container { 
            background: white;
            padding: 0;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
            opacity: 0.3;
          }
          .header h1 {
            margin: 0 0 15px 0;
            font-size: 2.5rem;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            position: relative;
            z-index: 1;
          }
          .header p {
            margin: 0;
            font-size: 1.2rem;
            opacity: 0.9;
            font-weight: 300;
            position: relative;
            z-index: 1;
          }
          .content-body {
            padding: 30px;
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
          .table-container {
            margin-top: 20px;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
          }
          table {
            width: 100%;
            max-width: 100%;
            border-collapse: collapse;
            border: 1px solid #adb5bd;
            border-radius: 4px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #adb5bd;
            border-right: 1px solid #adb5bd;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          th:last-child, td:last-child {
            border-right: none;
          }
          
          .workspace-name {
            font-weight: bold;
            position: relative;
            padding-right: 25px;
          }
          .workspace-badge-settings {
            display: inline-flex;
            align-items: stretch;
            margin: 2px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
            white-space: nowrap;
            background: none;
            padding: 0;
          }
          .workspace-badge-settings:hover .workspace-name-part {
            background: #0047b3;
          }
          .workspace-badge-settings:hover .bitbucket-logo-part {
            background: #003d99;
          }
          .workspace-name-part {
            background: #0052cc;
            color: white;
            padding: 3px 6px;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
            display: flex;
            align-items: center;
          }
          .bitbucket-logo-part {
            background: #0047b3;
            color: white;
            padding: 3px 6px;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            margin-left: -1px;
            display: flex;
            align-items: center;
          }
          .bitbucket-logo-part svg{
  width:16px;               /* pick the size you like */
  height:16px;
  fill:currentColor;        /* uses the white text colour you already set */
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
          .highlight {
            font-weight: bold;
            color: #007bff;
          }
          .alert-details {
            background: #fffbe6;
            border: 1px solid #ffe58f;
            color: #856404;
            padding: 12px 16px;
            border-radius: 6px;
            margin-top: 12px;
            margin-bottom: 8px;
            font-size: 1rem;
          }
          
          /* Smooth scaling from 1080px down to 850px */
          @media (max-width: 1080px) {
            body {
              min-width: unset;
            }
            
            /* Calculate scale based on viewport width */
            .table-container {
              font-size: calc(0.875rem + (100vw - 850px) * 0.000543);
              /* At 1080px: 0.875rem + 230 * 0.000543 ≈ 1rem (close to normal) */
              /* At 850px: 0.875rem + 0 = 0.875rem (smaller) */
            }
            
            table {
              font-size: inherit;
            }
            
            th, td {
              padding: calc(6px + (100vw - 850px) * 0.02609);
              /* At 1080px: 6px + 230 * 0.02609 ≈ 12px (normal padding) */
              /* At 850px: 6px + 0 = 6px (smaller padding) */
            }
            
            .workspace-badge, .workspace-badge-settings, .project-badge, .repo-badge, .direct-badge, .person-badge {
              font-size: calc(0.65rem + (100vw - 850px) * 0.000978);
              /* At 1080px: 0.65rem + 230 * 0.000978 ≈ 0.875rem (normal) */
              /* At 850px: 0.65rem (smaller) */
              margin: calc(1px + (100vw - 850px) * 0.00435);
            }
            
            .workspace-badge span, .workspace-badge-settings span, .project-badge span, .repo-badge span, .direct-badge span, .person-badge span {
              padding: calc(2px + (100vw - 850px) * 0.01739);
              /* At 1080px: 2px + 230 * 0.01739 ≈ 6px (normal) */
              /* At 850px: 2px (smaller) */
            }
            
            .header h1 {
              font-size: calc(1.8rem + (100vw - 850px) * 0.003043);
              /* At 1080px: 1.8rem + 230 * 0.003043 ≈ 2.5rem (normal) */
              /* At 850px: 1.8rem (smaller) */
            }
            
            .header p {
              font-size: calc(0.9rem + (100vw - 850px) * 0.001304);
              /* At 1080px: 0.9rem + 230 * 0.001304 ≈ 1.2rem (normal) */
              /* At 850px: 0.9rem (smaller) */
            }
          }
          
          /* Responsive improvements - scale and constrain properly */
          @media (max-width: 850px) {
            body {
              padding: 5px;
              margin: 0;
              min-width: unset;
            }
            .container {
              margin: 0;
              border-radius: 4px;
            }
            .header {
              padding: 20px 10px;
              border-radius: 4px 4px 0 0;
            }
            .header h1 {
              font-size: 1.5rem;
            }
            .header p {
              font-size: 0.85rem;
            }
            .content-body {
              padding: 8px;
            }
            
            /* Make table fit without scrolling */
            .table-container {
              margin-top: 10px;
              margin-left: 0;
              margin-right: 0;
              border-radius: 0;
            }
            table {
              font-size: 0.6rem;
              border-radius: 0;
              table-layout: fixed;
            }
            th, td {
              padding: 4px 2px;
              font-size: 0.6rem;
            }
            
            /* Column widths for mobile */
            th:nth-child(1), td:nth-child(1) { width: 25%; } /* Workspace */
            th:nth-child(2), td:nth-child(2) { width: 20%; } /* Person */
            th:nth-child(3), td:nth-child(3) { width: 30%; } /* Access */
            th:nth-child(4), td:nth-child(4) { width: 25%; } /* Repositories */
            
            /* Abbreviate headers on mobile */
            th:nth-child(4)::after { content: 'Repos'; }
            th:nth-child(4) { font-size: 0; }
            th:nth-child(4)::after { font-size: 0.6rem; }
            
            .workspace-refresh {
              font-size: 8px;
              padding: 1px;
              margin-left: 1px;
              top: 2px;
              right: 2px;
            }
            
            /* Stack badges vertically to save horizontal space */
            td:nth-child(3), td:nth-child(4) {
              white-space: normal;
            }
            
            .workspace-badge, .workspace-badge-settings, .project-badge, .repo-badge, .direct-badge, .person-badge {
              font-size: 0.5rem;
              margin: 1px 0;
              display: inline-flex; /* Use flexbox to keep parts together */
              max-width: 100%;
              white-space: nowrap; /* Keep badge parts together */
            }
            
            .workspace-badge span, .workspace-badge-settings span, .project-badge span, .repo-badge span, .direct-badge span, .person-badge span {
              padding: 1px 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              min-width: 0; /* Allow flex items to shrink */
            }
            
            /* Only truncate workspace names if they're actually too long */
            .workspace-name {
              font-size: 0.6rem;
              padding-right: 15px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            /* Hide "No access" text, just show dash */
            .no-access {
              font-size: 0;
            }
            .no-access::after {
              content: '-';
              font-size: 0.6rem;
            }
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
          <div class="header">
            <h1>Bitbucket People Manager</h1>
            <p>View people's access across all your managed workspaces</p>
          </div>
          
          <div class="content-body">
            <div id="workspacesData">
              <p>Loading workspaces data...</p>
            </div>
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
                  
                  // Collect all access types for this person in this workspace
                  const allGroups = [...memberData.groups];
                  const allProjects = [...new Set(memberData.repositories.filter(repo => repo.access_type === 'PROJECT').map(repo => repo.project))];
                  const allDirectRepos = memberData.repositories.filter(repo => repo.access_type === 'DIRECT').map(repo => repo.repository);
                  
                  // Create comprehensive removal target for this person
                  const comprehensiveRemoveTarget = {
                    groups: allGroups,
                    projects: allProjects,
                    repositories: allDirectRepos
                  };
                  
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
                          removeTarget: comprehensiveRemoveTarget
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
                        removeTarget: comprehensiveRemoveTarget
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
                      removeTarget: comprehensiveRemoveTarget
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
                        removeTarget: comprehensiveRemoveTarget
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
              <div class="table-container">
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
                        \${row['showWorkspace'] ? \`<td rowspan="\${row['workspaceSpan']}" class="workspace-name">
                          <span class="workspace-badge-settings"><span class="workspace-name-part">\${row['workspace']}</span><a href="https://bitbucket.org/\${row['workspaceSlug']}/workspace/settings/user-directory" target="_blank" class="bitbucket-logo-part" title="Open workspace settings">
                            <svg viewBox="3 4 18 16" width="20" height="20" aria-hidden="true">
                              <path d="M17.898 11.353l-.994 6.064c-.065.367-.324.583-.691.583H7.787c-.367 0-.627-.216-.691-.583L5.346 6.604C5.28 6.237 5.476 6 5.82 6h12.358c.346 0 .54.237.475.604l-.475 2.85c-.065.41-.303.582-.691.582h-7.432c-.109 0-.173.065-.152.194l.584 3.583c.021.086.086.151.172.151h2.68c.086 0 .15-.065.172-.151l.41-2.59c.044-.324.26-.453.563-.453H17.4c.432 0 .562.216.497.582z" fill="currentColor"/>
                            </svg>
                          </a></span>
                          <button class="workspace-refresh" onclick="refreshWorkspace('\${row['workspaceSlug']}')" title="Refresh workspace data">↻</button>
                        </td>\` : ''}
                        \${row['showPerson'] ? \`<td rowspan="\${row['personSpan']}"><div class="person-badge"><span class="person-name-part">\${row['person']}</span><span class="person-remove-x" data-remove-target="\${btoa(JSON.stringify(row['removeTarget']))}" data-user-uuid="\${row['personUuid']}" onclick="showRemoveModal('\${row['person']}', '\${row['workspaceSlug']}', 'specific', this)" title="Remove \${row['person']} from this specific access">×</span></div></td>\` : ''}
                        <td>\${row['access']}</td>
                        <td>\${row['repositories']}</td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
              <sub>\${sortedWorkspaces.length} workspaces | \${tableRows.length} access entries</sub>
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
              // Build comprehensive message showing all access types that will be removed
              const accessItems = [];
              
              if (removeTarget.groups && removeTarget.groups.length > 0) {
                accessItems.push(...removeTarget.groups.map(group => \`group \${group}\`));
              }
              
              if (removeTarget.projects && removeTarget.projects.length > 0) {
                accessItems.push(...removeTarget.projects.map(project => \`project \${project}\`));
              }
              
              if (removeTarget.repositories && removeTarget.repositories.length > 0) {
                accessItems.push(...removeTarget.repositories.map(repo => \`repo \${repo}\`));
              }
              
              if (accessItems.length > 0) {
                // Highlight only the group/project/repo names in the list
                const highlightedAccessItems = [];
                if (removeTarget.groups && removeTarget.groups.length > 0) {
                  highlightedAccessItems.push(...removeTarget.groups.map(group => \`group <span class="highlight">\${group}</span>\`));
                }
                if (removeTarget.projects && removeTarget.projects.length > 0) {
                  highlightedAccessItems.push(...removeTarget.projects.map(project => \`project <span class="highlight">\${project}</span>\`));
                }
                if (removeTarget.repositories && removeTarget.repositories.length > 0) {
                  highlightedAccessItems.push(...removeTarget.repositories.map(repo => \`repo <span class="highlight">\${repo}</span>\`));
                }
                message = \`Remove <span class="highlight">\${userName}</span> from Workspace <span class="highlight">\${workspaceSlug}</span>?<div class="alert-details">This will remove \${userName} from:<br>- \${highlightedAccessItems.join('<br>- ')}</div>\`;
              } else {
                message = \`Remove <span class="highlight">\${userName}</span> from Workspace <span class="highlight">\${workspaceSlug}</span>?\`;
              }
            } else {
              message = \`Remove \${userName}'s access to this specific resource?\`;
            }
            
            document.getElementById('removeModalText').innerHTML = message;
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
