const organizationsRoot = "/app/settings/organizations";

/**
 * Product routes that are shared by navigation and feature components.
 * Keeping these in one place prevents links from drifting as the app IA evolves.
 */
export const appRoutes = {
  overview: "/app",
  grants: "/app/grants",
  settings: "/app/settings",
  createGrant: "/grants/new",
  newOrganization: `${organizationsRoot}/new`,
  organization: (organizationId: string) =>
    `${organizationsRoot}/${organizationId}`,
  organizationMembers: (organizationId: string) =>
    `${organizationsRoot}/${organizationId}/members`,
  organizationTemplates: (organizationId: string) =>
    `${organizationsRoot}/${organizationId}/templates`,
  organizationGrants: (organizationId: string) =>
    `${organizationsRoot}/${organizationId}/grants`,
  organizationNewGrant: (organizationId: string) =>
    `${organizationsRoot}/${organizationId}/grants/new`,
} as const;
