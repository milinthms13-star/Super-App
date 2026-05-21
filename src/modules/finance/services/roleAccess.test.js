import { hasAnyRole, normalizeRoleTokens } from "./roleAccess";

describe("roleAccess", () => {
  test("normalizes and enriches finance role tokens", () => {
    const tokens = normalizeRoleTokens({
      role: "Finance_Admin",
      roles: ["Institution_Partner"],
      permissions: ["finance_consultant"],
    });

    expect(tokens).toEqual(expect.arrayContaining(["finance_admin", "admin", "consultant", "institution"]));
  });

  test("hasAnyRole checks role intersections safely", () => {
    expect(hasAnyRole(["admin", "finance"], ["consultant", "admin"])).toBe(true);
    expect(hasAnyRole(["user"], ["consultant", "admin"])).toBe(false);
    expect(hasAnyRole(null, ["admin"])).toBe(false);
  });
});
