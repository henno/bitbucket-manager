import { BitbucketClient } from './bitbucket-client';
import type { PersonData } from './types';

export class PeopleService {
  public client: BitbucketClient;

  constructor(username: string, token: string) {
    this.client = new BitbucketClient(username, token);
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

        // Process repositories for each member
        for (const member of members) {
          const workspaceData = {
            workspace: workspace.slug,
            groups: member.groups,
            repositories: [] as any[]
          };

          // Process first few repos to avoid timeout, but do it in parallel
          const reposToProcess = repositories.slice(0, 5);
          const repoPromises = reposToProcess.map(async (repo) => {
            try {
              const permissions = await this.client.getRepositoryPermissions(
                workspace.slug,
                repo,
                maxAgeMs
              );

              // Collect direct access users who aren't group members
              for (const perm of permissions) {
                if (perm.type === 'DIRECT' && !members.some(m => m.uuid === perm.user.uuid)) {
                  directAccessUsers.set(perm.user.uuid, {
                    uuid: perm.user.uuid,
                    display_name: perm.user.display_name,
                    groups: [] // No group membership
                  });
                }
              }

              const userPermissions = permissions.filter(p => p.user.uuid === member.uuid);
              return userPermissions.map(perm => ({
                repository: repo,
                permission: perm.permission,
                access_type: perm.type,
                group: perm.group
              }));
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              console.warn(`Failed to get permissions for ${workspace.slug}/${repo}:`, message);
              return [];
            }
          });

          const repoResults = await Promise.all(repoPromises);
          workspaceData.repositories = repoResults.flat();

          workspaceResults.push({ member, workspaceData });
        }

        // Process direct access users who aren't group members
        for (const [uuid, directUser] of directAccessUsers) {
          console.log(`Found direct-only user: ${directUser.display_name} in ${workspace.slug}`);

          const workspaceData = {
            workspace: workspace.slug,
            groups: [], // No group membership
            repositories: [] as any[]
          };

          // Get their repository permissions
          const repoPromises = repositories.slice(0, 5).map(async (repo) => {
            try {
              const permissions = await this.client.getRepositoryPermissions(
                workspace.slug,
                repo,
                maxAgeMs
              );

              const userPermissions = permissions.filter(p => p.user.uuid === uuid && p.type === 'DIRECT');
              return userPermissions.map(perm => ({
                repository: repo,
                permission: perm.permission,
                access_type: perm.type,
                group: perm.group
              }));
            } catch (error: unknown) {
              return [];
            }
          });

          const repoResults = await Promise.all(repoPromises);
          workspaceData.repositories = repoResults.flat();

          if (workspaceData.repositories.length > 0) {
            workspaceResults.push({ member: directUser, workspaceData });
          }
        }

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
      console.log(`Checking for direct repository permissions across all workspaces for ${peopleMap.size} people...`);

      for (const [uuid, person] of peopleMap) {
        console.log(`Checking cross-workspace access for: ${person.display_name} (${uuid})`);

        for (const workspace of workspaces) {
          // Skip if we already processed this workspace for this person
          if (person.workspaces.some(w => w.workspace === workspace.slug)) {
            console.log(`  Skipping ${workspace.slug} (already processed)`);
            continue;
          }

          console.log(`  Checking ${workspace.slug}...`);
          const repositories = await this.client.getWorkspaceRepositories(workspace.slug, maxAgeMs);
          console.log(`    Found ${repositories.length} repositories in ${workspace.slug}`);
          const directPermissions: any[] = [];

          for (const repo of repositories.slice(0, 5)) { // Limit to avoid timeout
            try {
              const permissions = await this.client.getRepositoryPermissions(workspace.slug, repo, maxAgeMs);
              const userDirectPermissions = permissions.filter(p =>
                p.user.uuid === uuid && p.type === 'DIRECT'
              );

              for (const perm of userDirectPermissions) {
                directPermissions.push({
                  repository: repo,
                  permission: perm.permission,
                  access_type: perm.type,
                  group: perm.group
                });
              }
            } catch (error: unknown) {
              // Ignore permission errors
            }
          }

          if (directPermissions.length > 0) {
            console.log(`Found direct access: ${person.display_name} -> ${workspace.slug} (${directPermissions.length} repos)`);
            person.workspaces.push({
              workspace: workspace.slug,
              groups: [], // No group membership, just direct access
              repositories: directPermissions
            });
          }
        }
      }
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
