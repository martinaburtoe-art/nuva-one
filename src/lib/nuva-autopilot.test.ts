import { describe, expect, it } from "vitest";
import { AUTOPILOT_DEFAULTS, canAutopilotExecute } from "./nuva-autopilot";

describe("Nüva Autopilot", () => {
  it("does not execute external or financial actions in prepare mode", () => {
    const send = AUTOPILOT_DEFAULTS.find((a) => a.id === "send-message")!;
    const finance = AUTOPILOT_DEFAULTS.find((a) => a.id === "post-finance")!;
    expect(canAutopilotExecute(send, "prepare")).toBe(false);
    expect(canAutopilotExecute(finance, "prepare")).toBe(false);
  });

  it("allows low-risk preparation without approval", () => {
    const task = AUTOPILOT_DEFAULTS.find((a) => a.id === "create-task")!;
    expect(canAutopilotExecute(task, "prepare")).toBe(true);
  });
});
