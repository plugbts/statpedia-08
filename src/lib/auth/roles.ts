export type UserRole = "owner" | "admin" | "mod" | "user" | "guest";

// Higher index means higher privilege
export const ROLE_ORDER: UserRole[] = ["guest", "user", "mod", "admin", "owner"];

export const roleRank = (role?: string): number => {
  const r = (role || "user").toLowerCase() as UserRole;
  const idx = ROLE_ORDER.indexOf(r);
  return idx >= 0 ? idx : ROLE_ORDER.indexOf("user");
};

export const hasRoleAtLeast = (actual: string | undefined, required: UserRole): boolean => {
  return roleRank(actual) >= roleRank(required);
};

export const isOwner = (role?: string) => (role || "").toLowerCase() === "owner";
export const isAdmin = (role?: string) => hasRoleAtLeast(role, "admin");
export const isMod = (role?: string) => hasRoleAtLeast(role, "mod");
