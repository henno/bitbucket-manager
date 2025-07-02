import type { BitbucketGroup, WorkspaceMember, RepositoryPermission, Workspace, BitbucketUserPermission } from './types';
import { CacheManager } from './cache';

export class BitbucketClient {
  private readonly baseUrlV1 = 'https://api.bitbucket.org/1.0';
  private readonly baseUrlV2 = 'https://api.bitbucket.org/2.0';
  private readonly auth: string;
  private readonly cache: CacheManager;
  private readonly pendingRequests: Map<string, Promise<any>> = new Map();

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      // Extract HTTP status and URL from error message like "HTTP 403: Forbidden for https://..."
      const match = error.message.match(/HTTP (\d+): .* for (https?:\/\/[^\s]+)/);
      if (match) {
        const [, status, url] = match;
        return `${status}: ${url}`;
      }
      return error.message;
    }
    return String(error);
  }

  constructor(username: string, token: string) {
    this.auth = 'Basic ' + btoa(`${username}:${token}`);
    this.cache = new CacheManager('database.sqlite');
  }

  private async request(url: string, maxAgeMs: number = 60 * 60 * 1000): Promise<any> {
    const cacheKey = `request:${url}`;
    
    // Check cache first
    const cached = await this.cache.get(cacheKey, maxAgeMs);
    if (cached) {
      // Check if this is a cached error
      if (cached && typeof cached === 'object' && 'error' in cached) {
        const errorMsg = cached.error as string;
        // If this is a cached 401 error, clear it and proceed with fresh request
        if (errorMsg.includes('HTTP 401: Unauthorized')) {
          console.log(`🗑️ Clearing cached 401 error for: ${url}`);
          this.cache.delete(cacheKey);
          // Don't return cached error, proceed to make fresh request
        } else {
          throw new Error(errorMsg);
        }
      } else {
        // console.log(`⚡ USING CACHE (${Math.round(maxAgeMs/1000)}s): ${url}`);
        return cached;
      }
    }

    // Check if request is already in progress
    if (this.pendingRequests.has(url)) {
      console.log(`⏳ WAITING for pending request: ${url}`);
      return await this.pendingRequests.get(url)!;
    }

    // Start new request
    console.log(`🌐 GET (not cached): ${url}`);
    
    const requestPromise = this.makeRequest(url, cacheKey);
    this.pendingRequests.set(url, requestPromise);
    
    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(url);
    }
  }

  private async makeRequest(url: string, cacheKey: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': this.auth,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const error = `HTTP ${response.status}: ${response.statusText} for ${url}`;
        
        // Log 401s more quietly since they're expected when credentials are wrong
        if (response.status === 401) {
          console.log(`🔒 Authentication failed: ${url}`);
        } else {
          console.log(`❌ FAILED: ${response.status} ${url}`);
        }
        
        // Cache 404s and other client errors to avoid retrying, but not 401s
        // 401s should not be cached as they might be resolved with new credentials
        if (response.status >= 400 && response.status < 500 && response.status !== 401) {
          await this.cache.set(cacheKey, { error });
        }
        
        return Promise.reject(new Error(error));
      }

      const data = await response.json();
      await this.cache.set(cacheKey, data);
      // console.log(`💾 SAVED TO CACHE: ${url}`);
      return data;
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Don't log 401 errors here since they're already logged above
      if (!message.includes('HTTP 401:')) {
        console.log(`💥 ERROR: ${url} - ${message}`);
      }
      throw error;
    }
  }

  async getWorkspacesWithAdminAccess(maxAgeMs: number = 60 * 60 * 1000): Promise<Workspace[]> {
    // noinspection SpellCheckingInspection
    const url = `${this.baseUrlV2}/workspaces?role=member&pagelen=100`;
    const data = await this.request(url, maxAgeMs);
    return data.values || [];
  }

  async getWorkspaceGroups(workspace: string, maxAgeMs: number = 60 * 60 * 1000): Promise<BitbucketGroup[]> {
    try {
      const url = `${this.baseUrlV1}/groups/${workspace}`;
      const groupSlugs = await this.request(url, maxAgeMs);
      
      const groups: BitbucketGroup[] = [];
      for (const group of groupSlugs) {
        try {
          const membersUrl = `${this.baseUrlV1}/groups/${workspace}/${group.slug}/members`;
          const members = await this.request(membersUrl, maxAgeMs);
          groups.push({
            slug: group.slug,
            members: members || []
          });
        } catch (error) {
          console.warn(`Could not fetch members for group ${group.slug} in workspace ${workspace}:`, error);
        }
      }
      
      return groups;
    } catch (error) {
      console.warn(this.formatError(error));
      return [];
    }
  }

  async getWorkspaceProjects(workspace: string, maxAgeMs: number = 60 * 60 * 1000): Promise<any[]> {
    try {
      let projects: any[] = [];
      let url = `${this.baseUrlV2}/workspaces/${workspace}/projects?pagelen=100`;
      
      while (url) {
        const data = await this.request(url, maxAgeMs);
        const projectList = data.values || [];
        projects = projects.concat(projectList);
        url = data.next;
      }
      
      return projects;
    } catch (error) {
      console.warn(this.formatError(error));
      return [];
    }
  }

  async getProjectUserPermissions(workspace: string, projectKey: string, maxAgeMs: number = 60 * 60 * 1000): Promise<any[]> {
    try {
      const permissions: any[] = [];
      let url = `${this.baseUrlV2}/workspaces/${workspace}/projects/${projectKey}/permissions-config/users?pagelen=100`;
      
      while (url) {
        const data = await this.request(url, maxAgeMs);
        const permList = data.values || [];
        permissions.push(...permList);
        url = data.next;
      }
      
      return permissions;
    } catch (error) {
      console.warn(this.formatError(error));
      return [];
    }
  }


  async getWorkspaceRepositories(workspace: string, maxAgeMs: number = 60 * 60 * 1000): Promise<string[]> {
    try {
      let repositories: string[] = [];
      // noinspection SpellCheckingInspection
      let url = `${this.baseUrlV2}/repositories/${workspace}?pagelen=100`;
      
      while (url) {
        const data = await this.request(url, maxAgeMs);
        const repoSlugs = data.values?.map((repo: any) => repo.slug) || [];
        repositories = repositories.concat(repoSlugs);
        url = data.next;
      }
      
      return repositories;
    } catch (error) {
      console.warn(this.formatError(error));
      return [];
    }
  }

  async getWorkspaceRepositoriesWithProjects(workspace: string, maxAgeMs: number = 60 * 60 * 1000): Promise<{slug: string, project?: {key: string, name: string}}[]> {
    try {
      let repositories: {slug: string, project?: {key: string, name: string}}[] = [];
      // noinspection SpellCheckingInspection
      let url = `${this.baseUrlV2}/repositories/${workspace}?pagelen=100`;
      
      while (url) {
        const data = await this.request(url, maxAgeMs);
        const repos = data.values?.map((repo: any) => ({
          slug: repo.slug,
          project: repo.project ? {
            key: repo.project.key,
            name: repo.project.name
          } : undefined
        })) || [];
        repositories = repositories.concat(repos);
        url = data.next;
      }
      
      return repositories;
    } catch (error) {
      console.warn(this.formatError(error));
      return [];
    }
  }

  async getRepositoryPermissions(workspace: string, repository: string, maxAgeMs: number = 60 * 60 * 1000): Promise<RepositoryPermission[]> {
    const permissions: RepositoryPermission[] = [];

    // Direct user permissions
    try {
      const userPermsUrl = `${this.baseUrlV2}/repositories/${workspace}/${repository}/permissions-config/users`;
      const userPerms = await this.request(userPermsUrl, maxAgeMs);
      
      for (const perm of userPerms.values || []) {
        permissions.push({
          repository,
          workspace,
          permission: perm.permission,
          type: 'DIRECT',
          user: {
            uuid: perm.user.uuid.replace(/[{}]/g, ''),
            display_name: perm.user.display_name,
            account_id: perm.user.account_id
          }
        });
      }
    } catch (error) {
      console.warn(`Failed to get user permissions for ${workspace}/${repository}:`, error);
    }

    // Group permissions
    try {
      const groupPermsUrl = `${this.baseUrlV2}/repositories/${workspace}/${repository}/permissions-config/groups`;
      const groupPerms = await this.request(groupPermsUrl, maxAgeMs);
      
      for (const groupPerm of groupPerms.values || []) {
        const groupMembersUrl = `${this.baseUrlV1}/groups/${workspace}/${groupPerm.group.slug}/members`;
        const groupMembers = await this.request(groupMembersUrl, maxAgeMs);
        
        for (const member of groupMembers || []) {
          permissions.push({
            repository,
            workspace,
            permission: groupPerm.permission,
            type: 'GROUP',
            group: groupPerm.group.slug,
            user: {
              uuid: member.uuid.replace(/[{}]/g, ''),
              display_name: member.display_name,
              account_id: member.account_id
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to get group permissions for ${workspace}/${repository}:`, error);
    }

    return permissions;
  }

  async getAllWorkspaceMembers(workspace: string, maxAgeMs: number = 60 * 60 * 1000): Promise<WorkspaceMember[]> {
    const groups = await this.getWorkspaceGroups(workspace, maxAgeMs);
    const memberMap = new Map<string, WorkspaceMember>();

    for (const group of groups) {
      for (const member of group.members) {
        const uuid = member.uuid.replace(/[{}]/g, '');
        if (!memberMap.has(uuid)) {
          memberMap.set(uuid, {
            uuid,
            display_name: member.display_name,
            groups: [],
            workspace
          });
        }
        memberMap.get(uuid)!.groups.push(group.slug);
      }
    }

    return Array.from(memberMap.values());
  }

  // User removal methods
  private async makeDeleteRequest(url: string): Promise<any> {
    console.log(`🗑️ DELETE: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': this.auth,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log(`❌ DELETE FAILED: ${response.status} ${url}`);
        const error = `HTTP ${response.status}: ${response.statusText} for ${url}`;
        return Promise.reject(new Error(error));
      }

      // Some DELETE requests return 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`💥 DELETE ERROR: ${url} - ${message}`);
      throw error;
    }
  }

  async removeUserFromGroup(workspace: string, groupSlug: string, userUuid: string): Promise<void> {
    // Clean UUID and URL-encode it with braces
    const cleanUuid = userUuid.replace(/[{}]/g, '');
    const encodedUuid = encodeURIComponent(`{${cleanUuid}}`);
    
    // Correct API endpoint according to spikker
    const url = `${this.baseUrlV1}/groups/${workspace}/${groupSlug}/members/${encodedUuid}`;
    await this.makeDeleteRequest(url);
  }

  async removeRepositoryPermission(workspace: string, repository: string, userUuid: string): Promise<void> {
    // Clean UUID and URL-encode it with braces
    const cleanUuid = userUuid.replace(/[{}]/g, '');
    const encodedUuid = encodeURIComponent(`{${cleanUuid}}`);
    
    // Correct API endpoint according to spikker
    const url = `${this.baseUrlV2}/repositories/${workspace}/${repository}/permissions-config/users/${encodedUuid}`;
    await this.makeDeleteRequest(url);
  }

  async removeProjectPermission(workspace: string, projectKey: string, userUuid: string): Promise<void> {
    // Clean UUID and URL-encode it with braces
    const cleanUuid = userUuid.replace(/[{}]/g, '');
    const encodedUuid = encodeURIComponent(`{${cleanUuid}}`);
    
    // Correct API endpoint according to spikker
    const url = `${this.baseUrlV2}/workspaces/${workspace}/projects/${projectKey}/permissions-config/users/${encodedUuid}`;
    await this.makeDeleteRequest(url);
  }

  async removeUserFromSpecificResources(
    workspace: string, 
    userIdentifier: string, 
    targets: {
      groups?: string[];
      repositories?: string[];
      projects?: string[];
      removeAll?: boolean;
      userUuid?: string;
    },
    isUuid: boolean = false
  ): Promise<{ removedFrom: string[], errors: string[] }> {
    const result = {
      removedFrom: [] as string[],
      errors: [] as string[]
    };

    try {
      let userUuid: string;
      let userName: string;
      
      if (isUuid) {
        // UUID provided directly - no need to resolve
        userUuid = userIdentifier;
        userName = userIdentifier; // We'll use UUID for logging when name isn't available
        console.log(`Using provided UUID directly: ${userUuid}`);
      } else {
        // Need to resolve name to UUID (original behavior)
        userName = userIdentifier;
        console.log(`Finding user "${userName}" in workspace "${workspace}"...`);
        
        // Check group memberships first
        const members = await this.getAllWorkspaceMembers(workspace, 0);
        let user = members.find(member => member.display_name === userName);
        
        if (user) {
          userUuid = user.uuid;
        } else {
          // Search for user in repository permissions
          console.log(`User ${userName} not found in groups, searching repository permissions...`);
          const repositories = await this.getWorkspaceRepositories(workspace, 0);
          
          const repoSearchPromises = repositories.map(async (repo) => {
            try {
              const url = `${this.baseUrlV2}/repositories/${workspace}/${repo}/permissions-config/users`;
              const data = await this.request(url, 0);
              const userPermissions = data.values || [];
              
              const directUser = userPermissions.find((p: BitbucketUserPermission) => 
                p.user?.display_name === userName
              );
              
              return directUser ? directUser.user.uuid.replace(/[{}]/g, '') : null;
            } catch (error) {
              return null;
            }
          });
          
          const searchResults = await Promise.all(repoSearchPromises);
          const foundUuid = searchResults.find(uuid => uuid !== null);
          
          if (!foundUuid) {
            console.error(`User "${userName}" not found in workspace "${workspace}"`);
            return { removedFrom: [], errors: [`User "${userName}" not found in workspace "${workspace}"`] };
          }
          
          userUuid = foundUuid;
        }

        console.log(`Found user ${userName} with UUID: ${userUuid}`);
      }

      // Handle removeAll fallback (current behavior)
      if (targets.removeAll) {
        console.log('RemoveAll flag set - removing from all resources...');
        // For removeAll, we still use the name since it does its own comprehensive lookup
        const nameForRemoveAll = isUuid ? userIdentifier : userName;
        return await this.removeUserFromWorkspace(workspace, nameForRemoveAll);
      }

      // Remove from specific groups
      if (targets.groups && targets.groups.length > 0) {
        console.log(`Removing from ${targets.groups.length} groups: ${targets.groups.join(', ')}`);
        
        for (const groupSlug of targets.groups) {
          try {
            await this.removeUserFromGroup(workspace, groupSlug, userUuid);
            result.removedFrom.push(`group:${groupSlug}`);
            console.log(`✅ Removed ${userName} from group ${groupSlug}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (!message.includes('404') && !message.includes('Not Found')) {
              result.errors.push(`Failed to remove from group ${groupSlug}: ${message}`);
            }
          }
        }
      }

      // Remove from specific repositories
      if (targets.repositories && targets.repositories.length > 0) {
        console.log(`Removing direct access from ${targets.repositories.length} repositories: ${targets.repositories.join(', ')}`);
        
        const repoPromises = targets.repositories.map(async (repo) => {
          try {
            await this.removeRepositoryPermission(workspace, repo, userUuid);
            result.removedFrom.push(`repository:${repo}(direct)`);
            console.log(`✅ Removed ${userName} direct permission from ${repo}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (!message.includes('404') && !message.includes('Not Found')) {
              result.errors.push(`Failed to remove repository permission for ${repo}: ${message}`);
            }
          }
        });
        
        await Promise.all(repoPromises);
      }

      // Remove from specific projects
      if (targets.projects && targets.projects.length > 0) {
        console.log(`Removing access from ${targets.projects.length} projects: ${targets.projects.join(', ')}`);
        
        const projectPromises = targets.projects.map(async (projectKey) => {
          try {
            await this.removeProjectPermission(workspace, projectKey, userUuid);
            result.removedFrom.push(`project:${projectKey}`);
            console.log(`✅ Removed ${userName} from project ${projectKey}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (!message.includes('404') && !message.includes('Not Found')) {
              result.errors.push(`Failed to remove project permission for ${projectKey}: ${message}`);
            }
          }
        });
        
        await Promise.all(projectPromises);
      }

      if (result.removedFrom.length === 0 && result.errors.length === 0) {
        console.log('No removal targets specified');
        result.errors.push('No removal targets specified');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to remove user: ${message}`);
    }

    return result;
  }

  async removeUserFromWorkspace(workspace: string, userName: string): Promise<{ removedFrom: string[], errors: string[] }> {
    const result = {
      removedFrom: [] as string[],
      errors: [] as string[]
    };

    try {
      // First, get comprehensive user information - what they actually have access to
      console.log(`Analyzing ${userName}'s actual permissions in workspace ${workspace}...`);
      
      const userAccess = await this.getUserWorkspaceAccess(workspace, userName);
      
      if (!userAccess) {
        console.error(`User "${userName}" not found in workspace "${workspace}"`);
        return { removedFrom: [], errors: [`User "${userName}" not found in workspace "${workspace}"`] };
      }

      console.log(`Found ${userName} with:`, {
        groups: userAccess.groups.length,
        repositories: userAccess.repositories.length,
        projects: userAccess.projects.length
      });

      // Remove from groups (only the ones they're actually in)
      for (const groupSlug of userAccess.groups) {
        try {
          await this.removeUserFromGroup(workspace, groupSlug, userAccess.uuid);
          result.removedFrom.push(`group:${groupSlug}`);
          console.log(`✅ Removed ${userName} from group ${groupSlug}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          if (!message.includes('404') && !message.includes('Not Found')) {
            result.errors.push(`Failed to remove from group ${groupSlug}: ${message}`);
          }
        }
      }

      // Remove from repositories (only the ones they actually have direct access to)
      if (userAccess.repositories.length > 0) {
        console.log(`Removing direct access from ${userAccess.repositories.length} repositories...`);
        
        const repoPromises = userAccess.repositories.map(async (repo) => {
          try {
            await this.removeRepositoryPermission(workspace, repo, userAccess.uuid);
            result.removedFrom.push(`repository:${repo}(direct)`);
            console.log(`✅ Removed ${userName} direct permission from ${repo}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (!message.includes('404') && !message.includes('Not Found')) {
              result.errors.push(`Failed to remove repository permission for ${repo}: ${message}`);
            }
          }
        });
        
        await Promise.all(repoPromises);
      } else {
        console.log(`${userName} has no direct repository permissions to remove`);
      }

      // Remove from projects (only the ones they actually have access to)
      if (userAccess.projects.length > 0) {
        console.log(`Removing access from ${userAccess.projects.length} projects...`);
        
        const projectPromises = userAccess.projects.map(async (projectKey) => {
          try {
            await this.removeProjectPermission(workspace, projectKey, userAccess.uuid);
            result.removedFrom.push(`project:${projectKey}`);
            console.log(`✅ Removed ${userName} from project ${projectKey}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (!message.includes('404') && !message.includes('Not Found')) {
              result.errors.push(`Failed to remove project permission for ${projectKey}: ${message}`);
            }
          }
        });
        
        await Promise.all(projectPromises);
      } else {
        console.log(`${userName} has no project permissions to remove`);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to remove user: ${message}`);
    }

    return result;
  }

  private async getUserWorkspaceAccess(workspace: string, userName: string): Promise<{
    uuid: string;
    display_name: string;
    groups: string[];
    repositories: string[];
    projects: string[];
  } | null> {
    // Check group memberships first
    const members = await this.getAllWorkspaceMembers(workspace, 0);
    let user = members.find(member => member.display_name === userName);
    
    let userUuid: string;
    let userGroups: string[] = [];
    let userRepositories: string[] = [];
    let userProjects: string[] = [];

    if (user) {
      userUuid = user.uuid;
      userGroups = user.groups;
      console.log(`${userName} is member of groups: ${userGroups.join(', ')}`);
    } else {
      // Search for user in repository permissions
      console.log(`User ${userName} not found in groups, searching repository permissions...`);
      const repositories = await this.getWorkspaceRepositories(workspace, 0);
      
      const repoSearchPromises = repositories.map(async (repo) => {
        try {
          const url = `${this.baseUrlV2}/repositories/${workspace}/${repo}/permissions-config/users`;
          const data = await this.request(url, 0);
          const userPermissions = data.values || [];
          
          const directUser = userPermissions.find((p: BitbucketUserPermission) => 
            p.user?.display_name === userName
          );
          
          if (directUser) {
            return {
              uuid: directUser.user.uuid.replace(/[{}]/g, ''),
              repo: repo
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });
      
      const searchResults = await Promise.all(repoSearchPromises);
      const foundUsers = searchResults.filter(result => result !== null);
      
      if (foundUsers.length === 0) {
        return null; // User not found
      }
      
      userUuid = foundUsers[0].uuid;
      userRepositories = foundUsers.map(f => f.repo);
      console.log(`Found ${userName} with direct access to repositories: ${userRepositories.join(', ')}`);
    }

    // Now check for additional direct repository permissions
    if (userGroups.length > 0) {
      console.log(`Checking for additional direct repository permissions for ${userName}...`);
      const repositories = await this.getWorkspaceRepositories(workspace, 0);
      
      const repoCheckPromises = repositories.map(async (repo) => {
        try {
          const url = `${this.baseUrlV2}/repositories/${workspace}/${repo}/permissions-config/users`;
          const data = await this.request(url, 0);
          const userPermissions = data.values || [];
          
          const hasDirectAccess = userPermissions.some((p: BitbucketUserPermission) => 
            p.user?.uuid?.replace(/[{}]/g, '') === userUuid
          );
          
          return hasDirectAccess ? repo : null;
        } catch (error) {
          return null;
        }
      });
      
      const repoResults = await Promise.all(repoCheckPromises);
      const additionalRepos = repoResults.filter(repo => repo !== null);
      userRepositories = [...new Set([...userRepositories, ...additionalRepos])];
      
      if (additionalRepos.length > 0) {
        console.log(`${userName} also has direct access to: ${additionalRepos.join(', ')}`);
      }
    }

    // Check project permissions
    try {
      const projects = await this.getWorkspaceProjects(workspace, 0);
      
      const projectCheckPromises = projects.map(async (project) => {
        if (!project.key) return null;
        
        try {
          const projectPermissions = await this.getProjectUserPermissions(workspace, project.key, 0);
          const hasProjectAccess = projectPermissions.some(p => 
            p.user?.uuid?.replace(/[{}]/g, '') === userUuid
          );
          
          return hasProjectAccess ? project.key : null;
        } catch (error) {
          return null;
        }
      });
      
      const projectResults = await Promise.all(projectCheckPromises);
      userProjects = projectResults.filter(project => project !== null);
      
      if (userProjects.length > 0) {
        console.log(`${userName} has project access to: ${userProjects.join(', ')}`);
      }
    } catch (error) {
      console.log('Could not check project permissions:', error);
    }

    return {
      uuid: userUuid,
      display_name: userName,
      groups: userGroups,
      repositories: userRepositories,
      projects: userProjects
    };
  }

  async invalidateWorkspaceCache(workspace: string, specificResources?: {
    groups?: string[];
    repositories?: string[];
    projects?: string[];
  }): Promise<void> {
    console.log(`🗑️ Invalidating cache for workspace: ${workspace}`, specificResources ? `(specific: ${JSON.stringify(specificResources)})` : '(all)');
    
    const keysToInvalidate = [];
    
    if (!specificResources) {
      // Invalidate everything for the workspace (original behavior)
      keysToInvalidate.push(
        // Workspace-specific keys
        `request:${this.baseUrlV1}/groups/${workspace}`,
        `request:${this.baseUrlV2}/repositories/${workspace}?pagelen=100`,
        `request:${this.baseUrlV2}/workspaces/${workspace}/projects?pagelen=100`,
      );
      
      // Also invalidate repository and project specific caches
      try {
        const repositories = await this.getWorkspaceRepositories(workspace, 24 * 60 * 60 * 1000); // Use cached data for this
        repositories.forEach(repo => {
          keysToInvalidate.push(
            `request:${this.baseUrlV2}/repositories/${workspace}/${repo}/permissions-config/users`,
            `request:${this.baseUrlV2}/repositories/${workspace}/${repo}/permissions-config/groups`,
            `request:${this.baseUrlV1}/privileges/${workspace}/${repo}`
          );
        });
        
        const projects = await this.getWorkspaceProjects(workspace, 24 * 60 * 60 * 1000); // Use cached data for this
        projects.forEach(project => {
          if (project.key) {
            keysToInvalidate.push(
              `request:${this.baseUrlV2}/workspaces/${workspace}/projects/${project.key}/permissions-config/users`,
              `request:${this.baseUrlV2}/workspaces/${workspace}/projects/${project.key}/permissions-config/groups`
            );
          }
        });
      } catch (error) {
        console.log('Could not get repositories/projects for cache invalidation, using basic invalidation');
      }
      
      // Add group member caches
      try {
        const groups = await this.getWorkspaceGroups(workspace, 24 * 60 * 60 * 1000); // Use cached data for this
        groups.forEach(group => {
          keysToInvalidate.push(`request:${this.baseUrlV1}/groups/${workspace}/${group.slug}/members`);
        });
      } catch (error) {
        console.log('Could not get groups for cache invalidation');
      }
    } else {
      // Selective invalidation based on specific resources
      
      // Invalidate specific groups
      if (specificResources.groups && specificResources.groups.length > 0) {
        specificResources.groups.forEach(groupSlug => {
          keysToInvalidate.push(`request:${this.baseUrlV1}/groups/${workspace}/${groupSlug}/members`);
          console.log(`🎯 Targeting group cache: ${groupSlug}`);
        });
        // Also invalidate the groups list to refresh membership
        keysToInvalidate.push(`request:${this.baseUrlV1}/groups/${workspace}`);
      }
      
      // Invalidate specific repositories
      if (specificResources.repositories && specificResources.repositories.length > 0) {
        specificResources.repositories.forEach(repo => {
          keysToInvalidate.push(
            `request:${this.baseUrlV2}/repositories/${workspace}/${repo}/permissions-config/users`,
            `request:${this.baseUrlV2}/repositories/${workspace}/${repo}/permissions-config/groups`,
            `request:${this.baseUrlV1}/privileges/${workspace}/${repo}`
          );
          console.log(`🎯 Targeting repository cache: ${repo}`);
        });
      }
      
      // Invalidate specific projects
      if (specificResources.projects && specificResources.projects.length > 0) {
        specificResources.projects.forEach(projectKey => {
          keysToInvalidate.push(
            `request:${this.baseUrlV2}/workspaces/${workspace}/projects/${projectKey}/permissions-config/users`,
            `request:${this.baseUrlV2}/workspaces/${workspace}/projects/${projectKey}/permissions-config/groups`
          );
          console.log(`🎯 Targeting project cache: ${projectKey}`);
        });
      }
    }
    
    // Delete all the cache entries
    for (const key of keysToInvalidate) {
      try {
        await this.cache.delete(key);
        console.log(`🗑️ Invalidated cache: ${key}`);
      } catch (error) {
        console.log(`Failed to invalidate cache key: ${key}`, error);
      }
    }
  }

  close(): void {
    this.cache.close();
  }
}