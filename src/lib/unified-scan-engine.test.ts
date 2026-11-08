import { afterEach, describe, expect, it, vi } from "vitest";
import { UnifiedScanEngine } from "./unified-scan-engine";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UnifiedScanEngine", () => {
  it("emits native scans through the same normalized contract", () => {
    const onDetect = vi.fn();
    const engine = new UnifiedScanEngine({ onDetect });
    engine.emitNative("  7801234567894  ", "EAN_13");
    expect(onDetect).toHaveBeenCalledTimes(1);
    expect(onDetect).toHaveBeenCalledWith(
      expect.objectContaining({
        rawValue: "7801234567894",
        format: "EAN_13",
        input: "native",
        timestamp: expect.any(Number),
      }),
    );
    engine.stop();
  });

  it("suppresses the same code when two scanner sources report it immediately", () => {
    const onDetect = vi.fn();
    const engine = new UnifiedScanEngine({ onDetect });
    engine.emitNative("7801234567894", "EAN_13");
    engine.emitNative("7801234567894", "EAN_13");
    expect(onDetect).toHaveBeenCalledTimes(1);
    engine.stop();
  });


  it("releases the camera track, interval and HID listener on stop", async () => {
    const track = { stop: vi.fn(), getCapabilities: () => ({ torch: false }), getSettings: () => ({ torch: false }) };
    const stream = {
      active: true,
      getVideoTracks: () => [track],
      getTracks: () => [track],
    };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const addWindowListener = vi.fn();
    const removeWindowListener = vi.fn();
    const clearInterval = vi.fn();
    const detector = class {
      static getSupportedFormats = vi.fn().mockResolvedValue(["ean_13", "ean_8"]);
      detect = vi.fn().mockResolvedValue([]);
    };
    const windowMock = {
      isSecureContext: true,
      BarcodeDetector: detector,
      setInterval: vi.fn().mockReturnValue(73),
      clearInterval,
      setTimeout: vi.fn(),
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }),
      addEventListener: addWindowListener,
      removeEventListener: removeWindowListener,
    };
    const documentMock = {
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("window", windowMock);
    vi.stubGlobal("document", documentMock);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("requestAnimationFrame", windowMock.requestAnimationFrame);
    vi.stubGlobal("HTMLMediaElement", { HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2 });

    const video = {
      isConnected: true,
      readyState: 2,
      videoWidth: 1280,
      videoHeight: 720,
      paused: false,
      muted: false,
      defaultMuted: false,
      srcObject: null as MediaProvider | null,
      setAttribute: vi.fn(),
      getBoundingClientRect: () => ({ width: 640, height: 480 }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      load: vi.fn(),
    } as unknown as HTMLVideoElement;

    const engine = new UnifiedScanEngine({ onDetect: vi.fn(), hidEnabled: true });
    await engine.start(video);

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(addWindowListener).toHaveBeenCalledWith("keydown", expect.any(Function), { capture: true });
    expect(video.srcObject).toBe(stream);

    engine.stop();

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(clearInterval).toHaveBeenCalledWith(73);
    expect(removeWindowListener).toHaveBeenCalledWith("keydown", expect.any(Function), { capture: true });
    expect(video.srcObject).toBeNull();
  });

  it("ignores empty native values", () => {
    const onDetect = vi.fn();
    const engine = new UnifiedScanEngine({ onDetect });
    engine.emitNative("   ");
    expect(onDetect).not.toHaveBeenCalled();
    engine.stop();
  });
});
