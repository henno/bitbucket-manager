import type { BitbucketGroup, WorkspaceMember, RepositoryPermission, Workspace } from './types';
import { CacheManager } from './cache';

export class BitbucketClient {
  private readonly baseUrlV1 = 'https://api.bitbucket.org/1.0';
  private readonly baseUrlV2 = 'https://api.bitbucket.org/2.0';
  private readonly auth: string;
  private readonly cache: CacheManager;
  private readonly pendingRequests: Map<string, Promise<any>> = new Map();

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
        throw new Error(cached.error as string);
      }
      // console.log(`⚡ USING CACHE (${Math.round(maxAgeMs/1000)}s): ${url}`);
      return cached;
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
        console.log(`❌ FAILED: ${response.status} ${url}`);
        const error = `HTTP ${response.status}: ${response.statusText} for ${url}`;
        
        // Cache 404s and other client errors to avoid retrying
        if (response.status >= 400 && response.status < 500) {
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
      console.log(`💥 ERROR: ${url} - ${message}`);
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
      console.warn(`Could not fetch groups for workspace ${workspace}:`, error);
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
      console.warn(`Could not fetch repositories for workspace ${workspace}:`, error);
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

  close(): void {
    this.cache.close();
  }
}