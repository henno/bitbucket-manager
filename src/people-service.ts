import { BitbucketClient } from './bitbucket-client';
import type { PersonData } from './types';

export class PeopleService {
  public client: BitbucketClient;

  constructor(username: string, token: string) {
    this.client = new BitbucketClient(username, token);
  }

  private addRepositoryPermissions(
    member: any,
    reposToProcess: string[],
    reposWithProjects: {slug: string, project?: {key: string, name: string}}[],
    repositoryPermissions: Map<string, any[]>,
    projectPermissions: Map<string, any[]>,
    workspaceData: any
  ): void {
    reposToProcess.forEach((repo) => {
      const permissions = repositoryPermissions.get(repo) || [];
      const userPermissions = permissions.filter((p: any) => p.user?.uuid === member.uuid);
      
      // Add direct repository permissions
      userPermissions.forEach((perm: any) => {
        workspaceData.repositories.push({
          repository: repo,
          permission: perm.permission,
          access_type: perm.type,
          group: perm.group
        });
      });
      
      // Check for project-level permissions
      const repoWithProject = reposWithProjects.find(r => r.slug === repo);
      if (repoWithProject?.project?.key) {
        const projectKey = repoWithProject.project.key;
        const projectPerms = projectPermissions.get(projectKey) || [];
        const memberProjectPermissions = projectPerms.filter((p: any) => {
          const projectUserUuid = p.user?.uuid?.replace(/[{}]/g, '');
          return projectUserUuid === member.uuid;
        });
        
        memberProjectPermissions.forEach((perm: any) => {
          workspaceData.repositories.push({
            repository: repo,
            permission: perm.permission,
            access_type: 'PROJECT',
            group: undefined
          });
        });
      }
    });
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

      // First, get repositories with their project information
      const reposWithProjects = await this.client.getWorkspaceRepositoriesWithProjects(workspaceSlug, maxAgeMs);
      const reposToProcess = reposWithProjects.map(r => r.slug);
      const repositoryPermissions = new Map<string, any[]>();
      
      // Get project-level permissions for all projects
      const projectPermissions = new Map<string, any[]>(); // projectKey -> user permissions
      const projects = await this.client.getWorkspaceProjects(workspaceSlug, maxAgeMs);
      
      for (const project of projects) {
        if (project.key) {
          try {
            const projectUserPerms = await this.client.getProjectUserPermissions(workspaceSlug, project.key, maxAgeMs);
            projectPermissions.set(project.key, projectUserPerms);
          } catch (error: unknown) {
            console.error(`Error getting project permissions for ${project.key}:`, error instanceof Error ? error.message : error);
          }
        }
      }
      
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
        this.addRepositoryPermissions(
          member,
          reposToProcess,
          reposWithProjects,
          repositoryPermissions,
          projectPermissions,
          workspaceData
        );

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

        // First, get repositories with their project information
        const reposWithProjects = await this.client.getWorkspaceRepositoriesWithProjects(workspace.slug, maxAgeMs);
        const reposToProcess = reposWithProjects.map(r => r.slug);
        const repositoryPermissions = new Map<string, any[]>();
        
        // Get project-level permissions for all projects
        const projectPermissions = new Map<string, any[]>(); // projectKey -> user permissions
        const projects = await this.client.getWorkspaceProjects(workspace.slug, maxAgeMs);
        
        for (const project of projects) {
          if (project.key) {
            try {
              const projectUserPerms = await this.client.getProjectUserPermissions(workspace.slug, project.key, maxAgeMs);
              projectPermissions.set(project.key, projectUserPerms);
            } catch (error: unknown) {
              console.error(`Error getting project permissions for ${project.key}:`, error instanceof Error ? error.message : error);
            }
          }
        }
        
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
          this.addRepositoryPermissions(
            member,
            reposToProcess,
            reposWithProjects,
            repositoryPermissions,
            projectPermissions,
            workspaceData
          );

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
