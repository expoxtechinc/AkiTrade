import { describe, expect, it } from "vitest";

const REQUIRED_PRODUCTION_KEYS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "VITE_APP_ID",
  "OAUTH_SERVER_URL",
  "VITE_OAUTH_PORTAL_URL",
  "EXPO_PUBLIC_APP_ID",
  "EXPO_PUBLIC_OAUTH_PORTAL_URL",
  "EXPO_PUBLIC_API_BASE_URL",
] as const;

describe("Vercel production environment", () => {
  it("contains the required OAuth and database variable names without exposing values", async () => {
    const token = process.env.VERCEL_TOKEN;
    expect(token, "VERCEL_TOKEN must be configured for Vercel deployment operations").toBeTruthy();

    const response = await fetch(
      "https://api.vercel.com/v10/projects/prj_0xXLkzptDhOdPekAUs1HuAH2lfP6/env?teamId=team_1ZNJyXBJQkkA9ZlruhSMgVYM",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(response.ok, "Vercel production environment could not be inspected").toBe(true);

    const payload = (await response.json()) as { envs?: Array<{ key?: string; target?: string | string[] }> };
    const productionKeys = new Set(
      (payload.envs ?? [])
        .filter((entry) => entry.target === "production" || entry.target?.includes("production"))
        .map((entry) => entry.key),
    );

    for (const key of REQUIRED_PRODUCTION_KEYS) {
      expect(productionKeys.has(key), `${key} must exist in Vercel production`).toBe(true);
    }
  }, 20_000);
});
