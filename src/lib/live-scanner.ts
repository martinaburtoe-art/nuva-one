export type LiveScanResult = { rawValue: string; format?: string };

export type LiveScannerOptions = {
  onDetect: (result: LiveScanResult) => void;
  onError?: (error: unknown) => void;
  facingMode?: "environment" | "user";
  scanIntervalMs?: number;
  duplicateCooldownMs?: number;
};

type BarcodeDetectorLike = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string; format?: string }>>;
};
type BarcodeDetectorConstructor = BarcodeDetectorLike & {
  getSupportedFormats?: () => Promise<string[]>;
};
type TorchCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: number;
  focusMode?: string[];
};
type TorchSettings = MediaTrackSettings & { torch?: boolean; zoom?: number; focusMode?: string };
type FallbackControls = { stop: () => void };
type ZXingResult = { getText(): string; getBarcodeFormat(): { toString(): string } };
type ZXingReader = {
  decodeFromStream: (
    stream: MediaStream,
    preview: HTMLVideoElement,
    callback: (result: ZXingResult | undefined, error?: unknown) => void,
  ) => Promise<FallbackControls>;
};

const SUPPORTED_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code",
  "data_matrix",
  "aztec",
  "pdf417",
] as const;
const isBrowser = () => typeof window !== "undefined" && typeof navigator !== "undefined";

function normalizeFormat(format?: string) {
  if (!format) return undefined;
  const value = format.toLowerCase().replace(/[-\s]/g, "_");
  const aliases: Record<string, string> = {
    ean13: "ean_13",
    ean_13: "ean_13",
    ean8: "ean_8",
    ean_8: "ean_8",
    upca: "upc_a",
    upc_a: "upc_a",
    upce: "upc_e",
    upc_e: "upc_e",
    code128: "code_128",
    code_128: "code_128",
    code39: "code_39",
    code_39: "code_39",
    itf: "itf",
    qr: "qr_code",
    qr_code: "qr_code",
    qrcode: "qr_code",
    datamatrix: "data_matrix",
    data_matrix: "data_matrix",
    aztec: "aztec",
    pdf417: "pdf417",
  };
  return aliases[value] ?? value;
}

export class LiveScanner {
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private fallbackControls: FallbackControls | null = null;
  private scanInFlight = false;
  private stopped = true;
  private pausedByVisibility = false;
  private lastValue = "";
  private lastDetectedAt = 0;
  private video: HTMLVideoElement | null = null;
  private startToken = 0;
  private visibilityHandler: (() => void) | null = null;
  private options: Required<
    Pick<LiveScannerOptions, "facingMode" | "scanIntervalMs" | "duplicateCooldownMs">
  > &
    LiveScannerOptions;

  constructor(options: LiveScannerOptions) {
    this.options = {
      facingMode: "environment",
      scanIntervalMs: 200,
      duplicateCooldownMs: 1200,
      ...options,
    };
  }

  static hasCameraSupport() {
    return isBrowser() && !!navigator.mediaDevices?.getUserMedia;
  }
  static hasNativeBarcodeDetector() {
    return isBrowser() && "BarcodeDetector" in window;
  }
  static isSupported() {
    return this.hasCameraSupport();
  }

  static supportedFormats() {
    return [...SUPPORTED_FORMATS];
  }
  getStream() {
    return this.stream;
  }
  getVideoTrack() {
    return this.stream?.getVideoTracks()[0] ?? null;
  }

  getTorchState() {
    const track = this.getVideoTrack();
    const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
    const settings = track?.getSettings?.() as TorchSettings | undefined;
    return { supported: capabilities?.torch === true, enabled: settings?.torch === true };
  }

  async setTorch(enabled: boolean) {
    const track = this.getVideoTrack();
    if (!track) throw new Error("La cámara no está activa.");
    const capabilities = track.getCapabilities?.() as TorchCapabilities | undefined;
    if (capabilities?.torch !== true)
      throw new Error("La linterna no está disponible en esta cámara.");
    await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] });
  }

  private emit(rawValue: string, format?: string) {
    const value = rawValue.trim();
    if (!value) return;
    const now = Date.now();
    if (value === this.lastValue && now - this.lastDetectedAt < this.options.duplicateCooldownMs)
      return;
    this.lastValue = value;
    this.lastDetectedAt = now;
    this.options.onDetect({ rawValue: value, format: normalizeFormat(format) });
  }

  private installVisibilityHandler() {
    if (!isBrowser()) return;
    this.removeVisibilityHandler();
    this.visibilityHandler = () => {
      this.pausedByVisibility = document.visibilityState === "hidden";
      if (!this.pausedByVisibility && this.video && !this.stopped)
        void this.ensureVideoPlaying(this.video).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.pausedByVisibility = document.visibilityState === "hidden";
  }

  private removeVisibilityHandler() {
    if (!isBrowser() || !this.visibilityHandler) return;
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.visibilityHandler = null;
  }

  private async ensureVideoPlaying(video: HTMLVideoElement) {
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.muted = true;
    video.defaultMuted = true;
    if (video.srcObject !== this.stream && this.stream) video.srcObject = this.stream;
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          video.removeEventListener("loadedmetadata", finish);
          video.removeEventListener("canplay", finish);
          resolve();
        };
        video.addEventListener("loadedmetadata", finish, { once: true });
        video.addEventListener("canplay", finish, { once: true });
        window.setTimeout(finish, 1800);
      });
    }
    try {
      await video.play();
    } catch (error) {
      video.load();
      await video.play();
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      await video.play();
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error(
        "La cámara entregó video sin dimensiones. Reinicia la cámara para continuar.",
      );
    }
  }

  private async acquireCamera() {
    const preferred: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: this.options.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(preferred);
    } catch (error) {
      const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (!fallback.getVideoTracks().length) {
        fallback.getTracks().forEach((track) => track.stop());
        throw error;
      }
      return fallback;
    }
  }

  private async startNative(video: HTMLVideoElement, token: number) {
    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor })
      .BarcodeDetector;
    let formats = [...SUPPORTED_FORMATS] as string[];
    if (typeof Detector.getSupportedFormats === "function") {
      const supported = await Detector.getSupportedFormats();
      formats = formats.filter((format) => supported.includes(format));
    }
    if (!formats.length)
      throw Object.assign(new Error("No hay formatos nativos compatibles."), {
        name: "NotSupportedError",
      });

    let detector: InstanceType<BarcodeDetectorLike>;
    try {
      detector = new Detector({ formats });
    } catch (error) {
      throw Object.assign(
        error instanceof Error ? error : new Error("BarcodeDetector no disponible."),
        { name: "NotSupportedError" },
      );
    }

    const scan = async () => {
      if (
        token !== this.startToken ||
        this.stopped ||
        this.pausedByVisibility ||
        !this.video ||
        !this.stream?.active ||
        this.scanInFlight ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      )
        return;
      this.scanInFlight = true;
      try {
        const results = await detector.detect(video);
        if (results[0] && token === this.startToken && !this.stopped && !this.pausedByVisibility)
          this.emit(results[0].rawValue, results[0].format);
      } catch (error) {
        if (!this.stopped && token === this.startToken && !this.pausedByVisibility)
          this.options.onError?.(error);
      } finally {
        this.scanInFlight = false;
      }
    };
    this.timer = window.setInterval(scan, this.options.scanIntervalMs);
    await scan();
  }

  private async startZXing(video: HTMLVideoElement, token: number) {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    if (this.stopped || token !== this.startToken || !this.stream?.active) return;
    const reader = new BrowserMultiFormatReader() as unknown as ZXingReader;
    this.fallbackControls = await reader.decodeFromStream(this.stream, video, (result) => {
      if (result && !this.stopped && !this.pausedByVisibility && token === this.startToken)
        this.emit(result.getText(), result.getBarcodeFormat().toString());
    });
    if (token !== this.startToken || this.stopped) this.fallbackControls?.stop();
  }

  async start(video: HTMLVideoElement) {
    if (!LiveScanner.hasCameraSupport())
      throw new Error("Este dispositivo no permite acceder a la cámara.");
    if (!isBrowser() || !window.isSecureContext)
      throw new Error("La cámara requiere una conexión segura (HTTPS).");
    this.stop();
    const token = ++this.startToken;
    this.stopped = false;
    this.pausedByVisibility = false;
    this.video = video;
    this.installVisibilityHandler();
    try {
      this.stream = await this.acquireCamera();
      if (this.stopped || token !== this.startToken) {
        this.stop();
        return;
      }
      const track = this.getVideoTrack();
      if (!track) throw new Error("La cámara no entregó una pista de video.");
      video.srcObject = this.stream;
      await this.ensureVideoPlaying(video);

      if (LiveScanner.hasNativeBarcodeDetector()) {
        try {
          await this.startNative(video, token);
          return;
        } catch (nativeError) {
          const fallbackAllowed =
            nativeError instanceof Error &&
            ["NotSupportedError", "TypeMismatchError", "InvalidStateError"].includes(
              nativeError.name,
            );
          if (!fallbackAllowed || this.stopped || token !== this.startToken) throw nativeError;
          if (this.timer !== null) window.clearInterval(this.timer);
          this.timer = null;
          await this.ensureVideoPlaying(video);
          await this.startZXing(video, token);
          return;
        }
      }

      await this.startZXing(video, token);
    } catch (error) {
      if (token === this.startToken) this.stop();
      this.options.onError?.(error);
      throw error;
    }
  }

  stop() {
    this.stopped = true;
    this.startToken += 1;
    this.removeVisibilityHandler();
    this.pausedByVisibility = false;
    if (this.timer !== null && isBrowser()) window.clearInterval(this.timer);
    this.timer = null;
    try {
      this.fallbackControls?.stop();
    } catch {
      /* already stopped */
    }
    this.fallbackControls = null;
    this.scanInFlight = false;
    this.stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* already stopped */
      }
    });
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }
}
