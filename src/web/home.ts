import { Hono } from 'hono';

export const homeRoute = new Hono();

homeRoute.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bitbucket People Manager</title>
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
      </style>
    </head>
    <body>
      <!-- Login Form (shown when not authenticated) -->
      <div id="loginForm" class="login-form hidden">
        <h2>Sign In</h2>
        <p>Please sign in to access Bitbucket People Manager</p>
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

      <script>
        // Check authentication status and redirect appropriately
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
              // Redirect to people page
              window.location.href = '/people';
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
          document.getElementById('loginForm').classList.remove('hidden');
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
              // Redirect to people page after successful login
              window.location.href = '/people';
            } else {
              document.getElementById('loginError').textContent = data.error || 'Login failed';
              document.getElementById('loginError').classList.remove('hidden');
            }
          } catch (error) {
            document.getElementById('loginError').textContent = error.message;
            document.getElementById('loginError').classList.remove('hidden');
          }
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