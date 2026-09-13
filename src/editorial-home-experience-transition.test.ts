import { describe, expect, it } from "vitest";
import { getEditorialTransitionState } from "./editorial-home-experience-transition";

describe("getEditorialTransitionState", () => {
  it("starts on the first chapter with no crossfade", () => {
    expect(getEditorialTransitionState(0)).toEqual({
      activeChapter: 0,
      localProgress: 0,
      transitionProgress: 0,
    });
  });

  it("keeps the chapter boundary continuous", () => {
    const beforeBoundary = getEditorialTransitionState(1 / 14 - 0.000001);
    const afterBoundary = getEditorialTransitionState(1 / 14 + 0.000001);

    expect(beforeBoundary.activeChapter).toBe(0);
    expect(afterBoundary.activeChapter).toBe(1);
    expect(beforeBoundary.transitionProgress).toBeGreaterThan(0.999);
    expect(afterBoundary.transitionProgress).toBeLessThan(0.0001);
  });

  it("uses a smooth interpolation instead of a mechanical linear crossfade", () => {
    const state = getEditorialTransitionState(0.5 / 14);

    expect(state.localProgress).toBe(0.5);
    expect(state.transitionProgress).toBeCloseTo(0.5, 5);

    const early = getEditorialTransitionState(0.25 / 14).transitionProgress;
    const late = getEditorialTransitionState(0.75 / 14).transitionProgress;
    expect(early).toBeLessThan(0.25);
    expect(late).toBeGreaterThan(0.75);
  });

  it("clamps progress outside the story range", () => {
    expect(getEditorialTransitionState(-1).activeChapter).toBe(0);
    expect(getEditorialTransitionState(2).activeChapter).toBe(13);
    expect(getEditorialTransitionState(2).transitionProgress).toBe(1);
  });

  it("disables interpolation when reduced motion is requested", () => {
    expect(getEditorialTransitionState(0.42, true).transitionProgress).toBe(0);
  });
});
