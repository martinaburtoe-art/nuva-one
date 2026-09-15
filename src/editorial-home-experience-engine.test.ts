import { describe, expect, it } from "vitest";
import { EDITORIAL_CHAPTERS, getChapterState, smoothstep } from "./editorial-home-experience-engine";
describe("editorial home engine",()=>{
it("keeps the 14-scene story",()=>expect(EDITORIAL_CHAPTERS).toHaveLength(14));
it("uses eased transitions",()=>{expect(smoothstep(.25)).toBeLessThan(.25);expect(smoothstep(.75)).toBeGreaterThan(.75)});
it("keeps boundaries continuous",()=>{const before=getChapterState(1/14-.000001);const after=getChapterState(1/14+.000001);expect(before.activeChapter).toBe(0);expect(after.activeChapter).toBe(1);expect(before.transitionProgress).toBeGreaterThan(.999);expect(after.transitionProgress).toBeLessThan(.001)});
it("honors reduced motion",()=>expect(getChapterState(.42,true).transitionProgress).toBe(0));
});
