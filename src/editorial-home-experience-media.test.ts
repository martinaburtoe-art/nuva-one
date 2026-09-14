import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./components/editorial-home-experience.tsx", import.meta.url), "utf8");

describe("editorial media contract", () => {
  it("uses the canonical cinematic asset directory", () => {
    expect(source).toContain("src={`/home-cinematic/${kind}.mp4`}");
  });

  it("uses generated posters for the media fallback", () => {
    expect(source).toContain("poster={`/home-cinematic/${kind}-poster.webp`}");
  });
});
