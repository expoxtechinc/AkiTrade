import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel serverless configuration", () => {
  it("uses the documented root Express entrypoint without publishing server artifacts as static output", () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
      outputDirectory?: string;
      functions?: Record<string, { maxDuration?: number }>;
    };
    const serverEntrypoint = readFileSync(resolve(process.cwd(), "server.ts"), "utf8");

    expect(config.outputDirectory).toBeUndefined();
    expect(config.functions?.["server.ts"]?.maxDuration).toBe(30);
    expect(serverEntrypoint).toContain('import express from "express"');
    expect(serverEntrypoint).toContain("createAkiTradeApp");
    expect(serverEntrypoint).toContain("app.listen");
    expect(serverEntrypoint).toContain("export default app");
    expect(existsSync(resolve(process.cwd(), "api/index.ts"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "api/[...path].ts"))).toBe(false);
  });
});
