export type LiveScanResult = { rawValue: string; format?: string };

export type LiveScannerOptions = {
  onDetect: (result: LiveScanResult) => void;
  onError?: (error: unknown) => void;
  facingMode?: 'environment' | 'user';
  scanIntervalMs?: number;
  duplicateCooldownMs?: number;
};

type BarcodeDetectorLike = new (options?: { formats?: string[] }) => { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string; format?: string }>> };
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchSettings = MediaTrackSettings & { torch?: boolean };
type FallbackControls = { stop: () => void };
type ZXingResult = { getText(): string; getBarcodeFormat(): { toString(): string } };
type ZXingReader = { decodeFromConstraints: (constraints: MediaStreamConstraints, preview: HTMLVideoElement, callback: (result: ZXingResult | undefined, error?: unknown) => void) => Promise<FallbackControls> };

const SUPPORTED_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'] as const;
const isBrowser = () => typeof window !== 'undefined' && typeof navigator !== 'undefined';

function normalizeFormat(format?: string) {
  if (!format) return undefined;
  const value = format.toLowerCase().replace(/[-\s]/g, '_');
  const aliases: Record<string, string> = {
    ean13: 'ean_13', ean_13: 'ean_13', ean8: 'ean_8', ean_8: 'ean_8',
    upca: 'upc_a', upc_a: 'upc_a', upce: 'upc_e', upc_e: 'upc_e',
    code128: 'code_128', code_128: 'code_128', code39: 'code_39', code_39: 'code_39',
    itf: 'itf', qr: 'qr_code', qr_code: 'qr_code', qrcode: 'qr_code',
  };
  return aliases[value] ?? value;
}

/** Camera-first scanner. Primary engine is BarcodeDetector; ZXing is the live-video fallback. */
export class LiveScanner {
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private fallbackControls: FallbackControls | null = null;
  private scanInFlight = false;
  private stopped = true;
  private lastValue = '';
  private lastDetectedAt = 0;
  private video: HTMLVideoElement | null = null;
  private options: Required<Pick<LiveScannerOptions, 'facingMode' | 'scanIntervalMs' | 'duplicateCooldownMs'>> & LiveScannerOptions;

  constructor(options: LiveScannerOptions) { this.options = { facingMode: 'environment', scanIntervalMs: 160, duplicateCooldownMs: 1200, ...options }; }

  static hasCameraSupport() { return isBrowser() && !!navigator.mediaDevices?.getUserMedia; }
  static hasNativeBarcodeDetector() { return isBrowser() && 'BarcodeDetector' in window; }
  static isSupported() { return this.hasCameraSupport(); }
  static supportedFormats() { return [...SUPPORTED_FORMATS]; }
  getStream() { return this.stream; }
  getVideoTrack() { return this.stream?.getVideoTracks()[0] ?? null; }

  getTorchState() {
    const track = this.getVideoTrack();
    const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined;
    const settings = track?.getSettings?.() as TorchSettings | undefined;
    return { supported: capabilities?.torch === true, enabled: settings?.torch === true };
  }

  async setTorch(enabled: boolean) {
    const track = this.getVideoTrack();
    if (!track) throw new Error('La cámara no está activa.');
    const capabilities = track.getCapabilities?.() as TorchCapabilities | undefined;
    if (capabilities?.torch !== true) throw new Error('La linterna no está disponible en esta cámara.');
    await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] });
  }

  private emit(rawValue: string, format?: string) {
    const value = rawValue.trim();
    if (!value) return;
    const now = Date.now();
    if (value === this.lastValue && now - this.lastDetectedAt < this.options.duplicateCooldownMs) return;
    this.lastValue = value;
    this.lastDetectedAt = now;
    this.options.onDetect({ rawValue: value, format: normalizeFormat(format) });
  }

  private async startNative(video: HTMLVideoElement) {
    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorLike }).BarcodeDetector;
    const detector = new Detector({ formats: [...SUPPORTED_FORMATS] });
    const scan = async () => {
      if (this.stopped || !this.video || !this.stream?.active || this.scanInFlight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      this.scanInFlight = true;
      try {
        const results = await detector.detect(video);
        if (results[0]) this.emit(results[0].rawValue, results[0].format);
      } catch (error) {
        if (!this.stopped) this.options.onError?.(error);
      } finally { this.scanInFlight = false; }
    };
    this.timer = window.setInterval(scan, this.options.scanIntervalMs);
    await scan();
  }

  private async startZXing(video: HTMLVideoElement) {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    if (this.stopped) return;
    const reader = new BrowserMultiFormatReader() as unknown as ZXingReader;
    this.fallbackControls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: this.options.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      video,
      (result) => { if (result && !this.stopped) this.emit(result.getText(), result.getBarcodeFormat().toString()); },
    );
    this.stream = video.srcObject instanceof MediaStream ? video.srcObject : null;
  }

  async start(video: HTMLVideoElement) {
    if (!LiveScanner.hasCameraSupport()) throw new Error('Este dispositivo no permite acceder a la cámara.');
    this.stop();
    this.stopped = false;
    this.video = video;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.muted = true;
    try {
      if (LiveScanner.hasNativeBarcodeDetector()) {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: this.options.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (this.stopped) { this.stop(); return; }
        video.srcObject = this.stream;
        await video.play();
        await this.startNative(video);
      } else {
        await this.startZXing(video);
        await video.play().catch(() => undefined);
      }
    } catch (error) {
      this.stop();
      this.options.onError?.(error);
      throw error;
    }
  }

  stop() {
    this.stopped = true;
    if (this.timer !== null && isBrowser()) window.clearInterval(this.timer);
    this.timer = null;
    try { this.fallbackControls?.stop(); } catch { /* already stopped */ }
    this.fallbackControls = null;
    this.scanInFlight = false;
    this.stream?.getTracks().forEach((track) => { try { track.stop(); } catch { /* already stopped */ } });
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }
}
