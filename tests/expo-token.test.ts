import { describe, expect, it } from "vitest";

describe("Expo deployment credential", () => {
  it("authenticates a lightweight current-user query without exposing the access token", async () => {
    const token = process.env.EXPO_TOKEN;
    expect(token).toBeTruthy();

    const response = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "query AkiTradeExpoTokenCheck { me { id username } }" }),
    });
    expect(response.ok).toBe(true);

    const result = await response.json() as {
      data?: { me?: { id?: string; username?: string } };
      errors?: Array<{ message?: string }>;
    };
    expect(result.errors).toBeUndefined();
    expect(result.data?.me?.id).toBeTruthy();
    expect(result.data?.me?.username).toBeTruthy();
  }, 20_000);
});
