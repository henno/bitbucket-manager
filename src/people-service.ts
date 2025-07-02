import { BitbucketClient } from './bitbucket-client';
import type { PersonData } from './types';

// Add environment variable reading for hiding user
const HIDE_MYSELF = process.env.HIDE_MYSELF === 'true';
const HIDE_MYSELF_UUID = process.env.HIDE_MYSELF_UUID || '';


export class PeopleService {
  public client: BitbucketClient;

  constructor(username: string, token: string) {
    this.client = new BitbucketClient(username, token);
  }

  private async fetchProjectPermissions(
    workspaceSlug: string,
    maxAgeMs: number
  ): Promise<Map<string, any[]>> {
    const projectPermissions = new Map<string, any[]>();
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
    return projectPermissions;
  }

  private async fetchRepositoryPermissions(
    workspaceSlug: string,
    reposToProcess: string[],
    maxAgeMs: number,
    members: any[],
    directAccessUsers: Map<string, any>
  ): Promise<Map<string, any[]>> {
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
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to get permissions for ${workspaceSlug}/${repo}:`, message);
        repositoryPermissions.set(repo, []); // Set empty array for failed repos
      }
    });

    await Promise.all(repoPermissionPromises);
    return repositoryPermissions;
  }

  private collectProjectUsers(
    projectPermissions: Map<string, any[]>,
    members: any[],
    directAccessUsers: Map<string, any>
  ): void {
    // Collect users who have project permissions but might not have repository access
    for (const [_projectKey, projectPerms] of projectPermissions.entries()) {
      for (const perm of projectPerms) {
        const projectUserUuid = perm.user?.uuid?.replace(/[{}]/g, '');
        if (projectUserUuid && !members.some(m => m.uuid === projectUserUuid) && !directAccessUsers.has(projectUserUuid)) {
          directAccessUsers.set(projectUserUuid, {
            uuid: projectUserUuid,
            display_name: perm.user.display_name,
            groups: [] // No group membership
          });
        }
      }
    }
  }

  private processDirectAccessUsers(
    workspaceSlug: string,
    directAccessUsers: Map<string, any>,
    reposToProcess: string[],
    reposWithProjects: {slug: string, project?: {key: string, name: string}}[],
    repositoryPermissions: Map<string, any[]>,
    projectPermissions: Map<string, any[]>,
    hideMyself: boolean = false
  ): Promise<({ member: any, workspaceData: any } | null)[]> {
    const directAccessPromises = Array.from(directAccessUsers.entries()).map(async ([uuid, directUser]) => {
      // Skip if this is the user to hide (only in getAllPeople)
      if (hideMyself && HIDE_MYSELF && HIDE_MYSELF_UUID && uuid === HIDE_MYSELF_UUID) {
        return null;
      }

      const workspaceData = {
        workspace: workspaceSlug,
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

      // Also check for project permissions
      this.addRepositoryPermissions(
        directUser,
        reposToProcess,
        reposWithProjects,
        repositoryPermissions,
        projectPermissions,
        workspaceData
      );

      if (workspaceData.repositories.length > 0) {
        return { member: directUser, workspaceData };
      }
      return null;
    });

    return Promise.all(directAccessPromises);
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
            group: undefined,
            project: projectKey
          });
        });
      }
    });
  }

  async getWorkspacePeople(workspaceSlug: string, maxAgeMs: number = 60 * 60 * 1000): Promise<PersonData[]> {
    console.log(`Fetching people for workspace: ${workspaceSlug}`);


    const peopleMap = new Map<string, PersonData>();

    try {
      // Fetch members and repositories with projects in parallel for the specific workspace
      const [members, reposWithProjects] = await Promise.all([
        this.client.getAllWorkspaceMembers(workspaceSlug, maxAgeMs),
        this.client.getWorkspaceRepositoriesWithProjects(workspaceSlug, maxAgeMs)
      ]);

      if (members.length === 0) {
        return [];
      }

      const workspaceResults: { member: any, workspaceData: any }[] = [];
      const directAccessUsers = new Map<string, any>();

      // Use the repositories with project information we already fetched
      const reposToProcess = reposWithProjects.map(r => r.slug);

      // Get project-level permissions for all projects
      const projectPermissions = await this.fetchProjectPermissions(workspaceSlug, maxAgeMs);
      const repositoryPermissions = await this.fetchRepositoryPermissions(workspaceSlug, reposToProcess, maxAgeMs, members, directAccessUsers);
      this.collectProjectUsers(projectPermissions, members, directAccessUsers);

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

        workspaceResults.push({ member, workspaceData });
      });

      // Process direct access users who aren't group members using cached permissions
      const directAccessResults = await this.processDirectAccessUsers(
        workspaceSlug,
        directAccessUsers,
        reposToProcess,
        reposWithProjects,
        repositoryPermissions,
        projectPermissions,
        false // Don't hide myself in single workspace view
      );
      workspaceResults.push(...directAccessResults.filter(result => result !== null));

      // Convert to PersonData format
      workspaceResults.forEach(({ member, workspaceData }) => {
        if (!peopleMap.has(member.uuid)) {
          peopleMap.set(member.uuid, {
            uuid: member.uuid,
            display_name: member.display_name,
            workspaces: []
          });
        }
        peopleMap.get(member.uuid)!.workspaces.push(workspaceData);
      });

      return Array.from(peopleMap.values());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed workspace ${workspaceSlug}:`, message);
      return [];
    }
  }

  async getAllPeople(maxAgeMs: number = 60 * 60 * 1000, includeDirectAccess: boolean = false): Promise<PersonData[]> {
    console.log('Fetching all people across workspaces');

    const peopleMap = new Map<string, PersonData>();

    try {
      // Get all workspaces with admin access
      const workspaces = await this.client.getWorkspacesWithAdminAccess(maxAgeMs);
      const uniqueWorkspaces = workspaces.filter((w, i, self) =>
        self.findIndex(ws => ws.slug === w.slug) === i
      );

      console.log(`Processing ${uniqueWorkspaces.length} workspaces`);

      // Process each workspace in parallel
      const workspacePromises = uniqueWorkspaces.map(async (workspace) => {
        try {

          // Fetch members and repositories with projects in parallel
          const [members, reposWithProjects] = await Promise.all([
            this.client.getAllWorkspaceMembers(workspace.slug, maxAgeMs),
            this.client.getWorkspaceRepositoriesWithProjects(workspace.slug, maxAgeMs)
          ]);

          if (members.length === 0) {
            return [];
          }

          const workspaceResults: { member: any, workspaceData: any }[] = [];
          const directAccessUsers = new Map<string, any>();

          // Use the repositories with project information we already fetched
          const reposToProcess = reposWithProjects.map(r => r.slug);

          // Get project-level permissions for all projects
          const projectPermissions = await this.fetchProjectPermissions(workspace.slug, maxAgeMs);
          
          // Fetch repository permissions in parallel (modified to handle getAllPeople case)
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
          this.collectProjectUsers(projectPermissions, members, directAccessUsers);

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
          const directAccessResults = await this.processDirectAccessUsers(
            workspace.slug,
            directAccessUsers,
            reposToProcess,
            reposWithProjects,
            repositoryPermissions,
            projectPermissions,
            true // Hide myself in all people view
          );
          workspaceResults.push(...directAccessResults.filter(result => result !== null));

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
      } else {
        console.log('Skipping cross-workspace direct permission check (use ?includeDirectAccess=true to enable)');
      }

      let result = Array.from(peopleMap.values());

      // Apply the hide-myself filter AFTER all data has been processed and cached
      if (HIDE_MYSELF && HIDE_MYSELF_UUID) {
        const normalizedHideUuid = HIDE_MYSELF_UUID.replace(/[{}]/g, '');

        const filteredResult = result.filter(person => {
          const normalizedPersonUuid = person.uuid?.replace(/[{}]/g, '') || '';
          const shouldHide = normalizedPersonUuid === normalizedHideUuid;

          if (shouldHide) {
            console.log(`Hiding user with UUID: ${person.display_name} (${person.uuid})`);
          }

          return !shouldHide;
        });

        console.log(`Processed ${result.length} people, filtered to ${filteredResult.length} people from ${uniqueWorkspaces.length} workspaces`);
        return filteredResult;
      }

      console.log(`Processed ${result.length} people from ${uniqueWorkspaces.length} workspaces`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to get all people:', message);
      return [];
    }
  }

  close(): void {
    this.client.close();
  }
}
