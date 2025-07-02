export interface BitbucketUser {
  uuid: string;
  display_name: string;
  account_id: string;
}

export interface BitbucketGroup {
  slug: string;
  members: BitbucketUser[];
}

export interface WorkspaceMember {
  uuid: string;
  display_name: string;
  groups: string[];
  workspace: string;
}

export interface RepositoryPermission {
  repository: string;
  workspace: string;
  permission: string;
  type: 'DIRECT' | 'GROUP';
  user: BitbucketUser;
  group?: string;
}

export interface PersonData {
  uuid: string;
  display_name: string;
  workspaces: {
    workspace: string;
    groups: string[];
    repositories: {
      repository: string;
      permission: string;
      access_type: 'DIRECT' | 'GROUP' | 'PROJECT';
      group?: string;
      project?: string;
    }[];
  }[];
}

export interface Workspace {
  uuid: string;
  slug: string;
  name: string;
  is_private: boolean;
}

export interface BitbucketUserPermission {
  user: BitbucketUser;
  permission: string;
}

export interface BitbucketProjectPermission {
  user: BitbucketUser;
  permission: string;
}