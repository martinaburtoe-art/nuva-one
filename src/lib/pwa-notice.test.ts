import { describe, expect, it } from "vitest";
import { getPwaNoticeKind } from "./pwa-notice";

describe("getPwaNoticeKind", () => {
  it("shows an update even after the install notice was dismissed", () => {
    expect(getPwaNoticeKind({
      canInstall: false,
      installDismissed: true,
      updateReady: true,
      updateDismissed: false,
    })).toBe("update");
  });

  it("does not let a dismissed update hide an available install prompt", () => {
    expect(getPwaNoticeKind({
      canInstall: true,
      installDismissed: false,
      updateReady: true,
      updateDismissed: true,
    })).toBe("install");
  });

  it("keeps install and update dismissals independent", () => {
    expect(getPwaNoticeKind({
      canInstall: true,
      installDismissed: true,
      updateReady: true,
      updateDismissed: true,
    })).toBeNull();
  });

  it("prioritizes an update when both notices are available", () => {
    expect(getPwaNoticeKind({
      canInstall: true,
      installDismissed: false,
      updateReady: true,
      updateDismissed: false,
    })).toBe("update");
  });

  it("shows the install notice when it is available and not dismissed", () => {
    expect(getPwaNoticeKind({
      canInstall: true,
      installDismissed: false,
      updateReady: false,
      updateDismissed: false,
    })).toBe("install");
  });
});
