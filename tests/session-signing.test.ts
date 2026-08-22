import { describe, expect, it } from "vitest";

import { sdk } from "../server/_core/sdk";

describe("session signing", () => {
  it("signs and verifies a session through the dynamic jose loader", async () => {
    const token = await sdk.signSession({
      openId: "vercel-session-test",
      appId: "akitrade",
      name: "AkiTrade Test",
    });

    await expect(sdk.verifySession(token)).resolves.toEqual({
      openId: "vercel-session-test",
      appId: "akitrade",
      name: "AkiTrade Test",
    });
  });
});
