import { describe, expect, it } from "vitest";

describe("Vercel deployment credential", () => {
  it("authenticates against the Vercel user endpoint without exposing the token", async () => {
    const token = process.env.VERCEL_TOKEN;
    expect(token, "VERCEL_TOKEN must be configured for Vercel deployment operations").toBeTruthy();
    const response = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok, "Vercel rejected the configured deployment credential").toBe(true);
    const payload = await response.json() as { user?: { id?: string } };
    expect(payload.user?.id).toBeTruthy();
  }, 20_000);
});
