import { describe, expect, it } from "vitest";
import { EDITORIAL_CHAPTERS, getChapterState, smoothstep } from "./editorial-home-experience-engine";

describe("editorial home engine",()=>{
 it("keeps the 14-scene story",()=>expect(EDITORIAL_CHAPTERS).toHaveLength(14));
 it("uses eased transitions",()=>{expect(smoothstep(.25)).toBeLessThan(.25);expect(smoothstep(.75)).toBeGreaterThan(.75)});
 it("uses the previous scene as outgoing and the new scene as incoming at a boundary",()=>{
  const after=getChapterState(1/14+.000001);
  expect(after.activeChapter).toBe(1);expect(after.outgoingChapter).toBe(0);expect(after.incomingChapter).toBe(1);expect(after.transitionProgress).toBeLessThan(.001);
 });
 it("finishes each crossfade inside the first 24 percent of the new chapter",()=>{
  const state=getChapterState(1/14+.24/14);
  expect(state.activeChapter).toBe(1);expect(state.outgoingChapter).toBe(0);expect(state.incomingChapter).toBe(1);expect(state.transitionProgress).toBeGreaterThan(.99);
 });
 it("keeps the first chapter stable",()=>{const state=getChapterState(.05);expect(state.activeChapter).toBe(0);expect(state.outgoingChapter).toBe(0);expect(state.incomingChapter).toBe(0);expect(state.transitionProgress).toBe(0)});
 it("honors reduced motion",()=>expect(getChapterState(.42,true).transitionProgress).toBe(0));
});
