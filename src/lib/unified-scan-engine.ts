import { LiveScanner, type LiveScanResult, type LiveScannerOptions } from "@/lib/live-scanner";

export type ScanInput = "camera" | "hid" | "native";
export type UnifiedScanResult = LiveScanResult & { input: ScanInput; timestamp: number };
export type UnifiedScanEngineOptions = Omit<LiveScannerOptions, "onDetect"> & {
  onDetect: (result: UnifiedScanResult) => void;
  hidEnabled?: boolean;
};

const HID_TERMINATORS = new Set(["Enter", "Tab"]);
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const HID_GAP_MS = 180;
const DUPLICATE_WINDOW_MS = 900;
const VIDEO_READY_TIMEOUT_MS = 2500;

/** Unified scan input: camera, native bridge and keyboard-emulating HID readers. */
export class UnifiedScanEngine {
  private readonly scanner: LiveScanner;
  private readonly options: UnifiedScanEngineOptions;
  private hidBuffer = "";
  private hidStartedAt = 0;
  private hidListener: ((event: KeyboardEvent) => void) | null = null;
  private stopped = true;
  private lastEmittedCode = "";
  private lastEmittedAt = 0;

  constructor(options: UnifiedScanEngineOptions) {
    this.options = { hidEnabled: false, ...options };
    this.scanner = new LiveScanner({
      ...options,
      onDetect: (result) => this.emit(result, "camera"),
    });
  }

  private emit(result: LiveScanResult, input: ScanInput) {
    const rawValue = result.rawValue.trim();
    if (!rawValue) return;
    const now = Date.now();
    if (rawValue === this.lastEmittedCode && now - this.lastEmittedAt < DUPLICATE_WINDOW_MS) return;
    this.lastEmittedCode = rawValue;
    this.lastEmittedAt = now;
    this.options.onDetect({ ...result, rawValue, input, timestamp: now });
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (!this.options.hidEnabled || this.stopped) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.matches(EDITABLE_SELECTOR)) return;
    const now = Date.now();
    if (this.hidStartedAt && now - this.hidStartedAt > HID_GAP_MS) {
      this.hidBuffer = "";
      this.hidStartedAt = 0;
    }
    if (HID_TERMINATORS.has(event.key)) {
      const value = this.hidBuffer.trim();
      this.hidBuffer = "";
      this.hidStartedAt = 0;
      if (value.length >= 3) {
        event.preventDefault();
        this.emit({ rawValue: value }, "hid");
      }
      return;
    }
    if (event.key.length !== 1) return;
    if (!this.hidStartedAt) this.hidStartedAt = now;
    this.hidBuffer += event.key;
  };

  startHid() {
    if (!this.options.hidEnabled || typeof window === "undefined" || this.hidListener) return;
    this.hidListener = this.handleKeydown;
    window.addEventListener("keydown", this.hidListener, { capture: true });
  }

  stopHid() {
    if (typeof window !== "undefined" && this.hidListener)
      window.removeEventListener("keydown", this.hidListener, { capture: true });
    this.hidListener = null;
    this.hidBuffer = "";
    this.hidStartedAt = 0;
  }

  private async waitForVideoReady(video: HTMLVideoElement) {
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const deadline = Date.now() + VIDEO_READY_TIMEOUT_MS;
    const hasLayout = () => {
      const rect = video.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    while (!this.stopped && Date.now() < deadline) {
      if (video.isConnected && hasLayout()) break;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }

    if (this.stopped) return;

    // Radix Dialog renders through a portal; give the browser two paint cycles
    // to attach the element and settle its layout before getUserMedia/play().
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }

  async start(video: HTMLVideoElement) {
    this.stopped = false;
    this.lastEmittedCode = "";
    this.lastEmittedAt = 0;
    await this.waitForVideoReady(video);
    if (this.stopped) return;
    this.startHid();
    await this.scanner.start(video);
    if (this.stopped) return;

    // Some mobile browsers resolve getUserMedia before the video has actually
    // begun rendering. Explicitly attach/play again after the stream exists.
    const stream = this.scanner.getStream();
    if (stream && video.srcObject !== stream) video.srcObject = stream;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await video.play();
      }
    }
  }

  emitNative(rawValue: string, format?: string) {
    if (!this.stopped) this.emit({ rawValue, format }, "native");
  }

  getStream() {
    return this.scanner.getStream();
  }
  getVideoTrack() {
    return this.scanner.getVideoTrack();
  }
  getTorchState() {
    return this.scanner.getTorchState();
  }
  setTorch(enabled: boolean) {
    return this.scanner.setTorch(enabled);
  }
  stop() {
    this.stopped = true;
    this.stopHid();
    this.scanner.stop();
  }
}
