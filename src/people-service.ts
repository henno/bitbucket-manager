import { BitbucketClient } from './bitbucket-client';
import type { PersonData } from './types';

export class PeopleService {
  public client: BitbucketClient;

  constructor(username: string, token: string) {
    this.client = new BitbucketClient(username, token);
  }

  async getWorkspacePeople(workspaceSlug: string, maxAgeMs: number = 60 * 60 * 1000): Promise<PersonData[]> {
    console.log(`Fetching people for workspace: ${workspaceSlug}`);
    
    const peopleMap = new Map<string, PersonData>();
    
    try {
      // Fetch members and repositories in parallel for the specific workspace
      const [members, repositories] = await Promise.all([
        this.client.getAllWorkspaceMembers(workspaceSlug, maxAgeMs),
        this.client.getWorkspaceRepositories(workspaceSlug, maxAgeMs)
      ]);

      console.log(`Workspace ${workspaceSlug}: ${members.length} members, ${repositories.length} repos`);

      if (members.length === 0) {
        console.log(`No members in ${workspaceSlug}, returning empty`);
        return [];
      }

      const workspaceResults: { member: any, workspaceData: any }[] = [];
      const directAccessUsers = new Map<string, any>();

      // First, fetch all repository permissions once (not per member)
      const reposToProcess = repositories.slice(0, 5);
      const repositoryPermissions = new Map<string, any[]>();
      
      const repoPermissionPromises = reposToProcess.map(async (repo) => {
        try {
          const permissions = await this.client.getRepositoryPermissions(
            workspaceSlug,
            repo,
            maxAgeMs
          );
          repositoryPermissions.set(repo, permissions);
          
          // Collect direct access users while we're at it
          permissions.forEach((perm: any) => {
            if (perm.user && !members.find((m: any) => m.uuid === perm.user.uuid)) {
              directAccessUsers.set(perm.user.uuid, perm.user);
            }
          });
        } catch (error: unknown) {
          console.error(`Error getting permissions for ${workspaceSlug}/${repo}:`, error instanceof Error ? error.message : error);
          repositoryPermissions.set(repo, []); // Set empty array for failed repos
        }
      });

      await Promise.all(repoPermissionPromises);

      // Now process each member using the cached repository permissions
      members.forEach((member) => {
        const workspaceData = {
          workspace: workspaceSlug,
          groups: member.groups,
          repositories: [] as any[]
        };

        // Check member's access to each repository using cached permissions
        reposToProcess.forEach((repo) => {
          const permissions = repositoryPermissions.get(repo) || [];
          const memberPermission = permissions.find((p: any) => p.user?.uuid === member.uuid);
          if (memberPermission) {
            workspaceData.repositories.push({
              repository: repo,
              permission: memberPermission.permission
            });
          }
        });

        if (workspaceData.repositories.length > 0) {
          workspaceResults.push({ member, workspaceData });
        }
      });

      // Process workspace members
      workspaceResults.forEach(({ member, workspaceData }) => {
        if (!peopleMap.has(member.uuid)) {
          peopleMap.set(member.uuid, {
            uuid: member.uuid,
            display_name: member.display_name,
            workspaces: []
          });
        }

        if (workspaceData.repositories.length > 0) {
          peopleMap.get(member.uuid)!.workspaces.push(workspaceData);
        }
      });

      // Process direct access users using cached permissions
      const directAccessPromises = Array.from(directAccessUsers.entries()).map(async ([uuid, user]) => {
        if (!peopleMap.has(uuid)) {
          peopleMap.set(uuid, {
            uuid: user.uuid,
            display_name: user.display_name,
            workspaces: []
          });
        }

        // Use cached repository permissions instead of fetching again
        const userRepos: any[] = [];
        reposToProcess.forEach((repo) => {
          const permissions = repositoryPermissions.get(repo) || [];
          const userPermission = permissions.find((p: any) => p.user?.uuid === uuid);
          if (userPermission) {
            userRepos.push({
              repository: repo,
              permission: userPermission.permission
            });
          }
        });

        if (userRepos.length > 0) {
          peopleMap.get(uuid)!.workspaces.push({
            workspace: workspaceSlug,
            groups: [],
            repositories: userRepos
          });
        }
      });

      await Promise.all(directAccessPromises);

    } catch (error: unknown) {
      console.error(`Error processing workspace ${workspaceSlug}:`, error instanceof Error ? error.message : error);
    }

    return Array.from(peopleMap.values());
  }

  async getAllPeople(maxAgeMs: number = 60 * 60 * 1000, includeDirectAccess: boolean = false): Promise<PersonData[]> {
    console.log(`Fetching workspaces... (includeDirectAccess: ${includeDirectAccess})`);
    const workspaces = await this.client.getWorkspacesWithAdminAccess(maxAgeMs);
    console.log(`Found ${workspaces.length} workspaces`);

    const peopleMap = new Map<string, PersonData>();

    // Process all workspaces in parallel
    console.log(`Processing ${workspaces.length} workspaces in parallel...`);

    const workspacePromises = workspaces.map(async (workspace, i) => {
      console.log(`Starting workspace ${i + 1}/${workspaces.length}: ${workspace.slug}`);

      try {
        // Fetch members and repositories in parallel for each workspace
        const [members, repositories] = await Promise.all([
          this.client.getAllWorkspaceMembers(workspace.slug, maxAgeMs),
          this.client.getWorkspaceRepositories(workspace.slug, maxAgeMs)
        ]);

        console.log(`Workspace ${workspace.slug}: ${members.length} members, ${repositories.length} repos`);

        if (members.length === 0) {
          console.log(`No members in ${workspace.slug}, skipping`);
          return [];
        }

        const workspaceResults: { member: any, workspaceData: any }[] = [];
        const directAccessUsers = new Map<string, any>(); // Track users with direct access

        // First, fetch all repository permissions once (not per member)
        const reposToProcess = repositories.slice(0, 5);
        const repositoryPermissions = new Map<string, any[]>();
        
        const repoPermissionPromises = reposToProcess.map(async (repo) => {
          try {
            const permissions = await this.client.getRepositoryPermissions(
              workspace.slug,
              repo,
              maxAgeMs
            );
            repositoryPermissions.set(repo, permissions);
            
            // Collect direct access users while we're at it
            for (const perm of permissions) {
              if (perm.type === 'DIRECT' && !members.some(m => m.uuid === perm.user.uuid)) {
                directAccessUsers.set(perm.user.uuid, {
                  uuid: perm.user.uuid,
                  display_name: perm.user.display_name,
                  groups: [] // No group membership
                });
              }
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`Failed to get permissions for ${workspace.slug}/${repo}:`, message);
            repositoryPermissions.set(repo, []); // Set empty array for failed repos
          }
        });

        await Promise.all(repoPermissionPromises);

        // Now process each member using the cached repository permissions
        members.forEach((member) => {
          const workspaceData = {
            workspace: workspace.slug,
            groups: member.groups,
            repositories: [] as any[]
          };

          // Check member's access to each repository using cached permissions
          reposToProcess.forEach((repo) => {
            const permissions = repositoryPermissions.get(repo) || [];
            const userPermissions = permissions.filter(p => p.user.uuid === member.uuid);
            workspaceData.repositories.push(...userPermissions.map(perm => ({
              repository: repo,
              permission: perm.permission,
              access_type: perm.type,
              group: perm.group
            })));
          });

          workspaceResults.push({ member, workspaceData });
        });

        // Process direct access users who aren't group members using cached permissions
        const directAccessPromises = Array.from(directAccessUsers.entries()).map(async ([uuid, directUser]) => {
          console.log(`Found direct-only user: ${directUser.display_name} in ${workspace.slug}`);

          const workspaceData = {
            workspace: workspace.slug,
            groups: [], // No group membership
            repositories: [] as any[]
          };

          // Use cached repository permissions instead of fetching again
          reposToProcess.forEach((repo) => {
            const permissions = repositoryPermissions.get(repo) || [];
            const userPermissions = permissions.filter(p => p.user.uuid === uuid && p.type === 'DIRECT');
            workspaceData.repositories.push(...userPermissions.map(perm => ({
              repository: repo,
              permission: perm.permission,
              access_type: perm.type,
              group: perm.group
            })));
          });

          if (workspaceData.repositories.length > 0) {
            return { member: directUser, workspaceData };
          }
          return null;
        });

        const directAccessResults = await Promise.all(directAccessPromises);
        workspaceResults.push(...directAccessResults.filter(result => result !== null));

        console.log(`✅ Completed workspace ${workspace.slug}`);
        return workspaceResults;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed workspace ${workspace.slug}:`, message);
        return [];
      }
    });

    // Wait for all workspaces to complete
    console.log('Waiting for all workspaces to complete...');
    const allWorkspaceResults = await Promise.all(workspacePromises);

    // Aggregate results
    for (const workspaceResults of allWorkspaceResults) {
      for (const { member, workspaceData } of workspaceResults) {
        if (!peopleMap.has(member.uuid)) {
          peopleMap.set(member.uuid, {
            uuid: member.uuid,
            display_name: member.display_name,
            workspaces: []
          });
        }
        peopleMap.get(member.uuid)!.workspaces.push(workspaceData);
      }
    }

    if (includeDirectAccess) {
      console.log('Cross-workspace direct permission check is now integrated into main processing flow');
    } else {
      console.log('Skipping cross-workspace direct permission check (use ?includeDirectAccess=true to enable)');
    }

    const result = Array.from(peopleMap.values());
    console.log(`Processed ${result.length} people from ${workspaces.length} workspaces`);
    return result;
  }

  close(): void {
    this.client.close();
  }
}
