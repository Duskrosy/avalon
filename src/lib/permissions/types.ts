export type PermissionTier = 1 | 2 | 3;

export type ResolvedView = {
  viewId: string;
  viewSlug: string;
  viewName: string;
  route: string;
  masterGroupSlug: string;
  masterGroupName: string;
  enabled: boolean;
  source: "user_override" | "department" | "default";
};

export type ResolvedNavigation = {
  masterGroup: {
    name: string;
    slug: string;
    icon: string | null;
  };
  views: {
    name: string;
    slug: string;
    route: string;
  }[];
}[];