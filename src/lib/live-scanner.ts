export type LiveScanResult = {
  rawValue: string;
  format?: string;
};

export type LiveScannerOptions = {
  onDetect: (result: LiveScanResult) => void;
  onError?: (error: unknown) => void;
  facingMode?: 'environment' | 'user';
  scanIntervalMs?: number;
  duplicateCooldownMs?: number;
};

type BarcodeDetectorLike = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string; format?: string }>>;
};

const SUPPORTED_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'qr_code',
] as const;

/**
 * Camera-first live barcode scanner.
 *
 * The primary path uses BarcodeDetector directly against the live video
 * stream. No frame is captured, uploaded, persisted, or sent to an AI model.
 * The class also exposes camera/torch capabilities for a production UI.
 */
export class LiveScanner {
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private scanInFlight = false;
  private stopped = true;
  private lastValue = '';
  private lastDetectedAt = 0;
  private video: HTMLVideoElement | null = null;
  private options: Required<
    Pick<LiveScannerOptions, 'facingMode' | 'scanIntervalMs' | 'duplicateCooldownMs'>
  > &
    LiveScannerOptions;

  constructor(options: LiveScannerOptions) {
    this.options = {
      facingMode: 'environment',
      scanIntervalMs: 160,
      duplicateCooldownMs: 1200,
      ...options,
    };
  }

  static hasCameraSupport() {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  static hasNativeBarcodeDetector() {
    return (
      typeof window !== 'undefined' &&
      'BarcodeDetector' in window
    );
  }

  static isSupported() {
    return this.hasCameraSupport() && this.hasNativeBarcodeDetector();
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
    const capabilities = track?.getCapabilities?.() as
      | MediaTrackCapabilities & { torch?: boolean }
      | undefined;

    return {
      supported: capabilities?.torch === true,
      enabled: (track?.getSettings?.() as MediaTrackSettings & { torch?: boolean } | undefined)?.torch === true,
    };
  }

  async setTorch(enabled: boolean) {
    const track = this.getVideoTrack();
    if (!track) throw new Error('La cámara no está activa.');

    const capabilities = track.getCapabilities?.() as
      | MediaTrackCapabilities & { torch?: boolean }
      | undefined;

    if (capabilities?.torch !== true) {
      throw new Error('La linterna no está disponible en esta cámara.');
    }

    await track.applyConstraints({
      advanced: [{ torch: enabled } as MediaTrackConstraintSet],
    });
  }

  async start(video: HTMLVideoElement) {
    if (!LiveScanner.hasCameraSupport()) {
      throw new Error('Este dispositivo no permite acceder a la cámara.');
    }

    if (!LiveScanner.hasNativeBarcodeDetector()) {
      throw new Error(
        'Este navegador no admite lectura de códigos en vivo mediante BarcodeDetector. Usa Chrome/Android actualizado o la app Nüva One.'
      );
    }

    this.stop();
    this.stopped = false;
    this.video = video;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: this.options.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (this.stopped) {
        this.stop();
        return;
      }

      video.srcObject = this.stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.muted = true;
      await video.play();

      const Detector = (window as unknown as {
        BarcodeDetector: BarcodeDetectorLike;
      }).BarcodeDetector;

      const detector = new Detector({
        formats: [...SUPPORTED_FORMATS],
      });

      const scan = async () => {
        if (
          this.stopped ||
          !this.video ||
          !this.stream?.active ||
          this.scanInFlight ||
          video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          return;
        }

        this.scanInFlight = true;
        try {
          const results = await detector.detect(video);
          const now = Date.now();

          for (const result of results) {
            const value = result.rawValue?.trim();
            if (!value) continue;

            if (
              value === this.lastValue &&
              now - this.lastDetectedAt < this.options.duplicateCooldownMs
            ) {
              continue;
            }

            this.lastValue = value;
            this.lastDetectedAt = now;
            this.options.onDetect({
              rawValue: value,
              format: result.format,
            });
            break;
          }
        } catch (error) {
          if (!this.stopped) this.options.onError?.(error);
        } finally {
          this.scanInFlight = false;
        }
      };

      this.timer = window.setInterval(scan, this.options.scanIntervalMs);
      await scan();
    } catch (error) {
      this.stop();
      this.options.onError?.(error);
      throw error;
    }
  }

  stop() {
    this.stopped = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.scanInFlight = false;

    this.stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // A stopped track is already in the desired terminal state.
      }
    });

    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }
}
