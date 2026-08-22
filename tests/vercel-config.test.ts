import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel serverless configuration", () => {
  it("uses API rewrites without publishing the server build directory as static output", () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
      outputDirectory?: string;
      rewrites?: Array<{ source: string; destination: string }>;
    };

    expect(config.outputDirectory).toBeUndefined();
    expect(config.rewrites).toEqual(
      expect.arrayContaining([
        { source: "/", destination: "/api/index" },
        { source: "/privacy", destination: "/api/index" },
        { source: "/terms", destination: "/api/index" },
      ]),
    );
  });
});
