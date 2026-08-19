export type LiveScanResult = {
  rawValue: string;
  format?: string;
};

export type LiveScannerOptions = {
  onDetect: (result: LiveScanResult) => void;
  onError?: (error: unknown) => void;
  facingMode?: 'environment' | 'user';
  scanIntervalMs?: number;
};

/**
 * Camera-first live barcode scanner. It uses the native BarcodeDetector API
 * when available, with no photo capture or upload. A frame is sampled from
 * the active video stream and decoded in memory only.
 */
export class LiveScanner {
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private lastValue = '';
  private lastDetectedAt = 0;
  private video: HTMLVideoElement | null = null;
  private options: Required<Pick<LiveScannerOptions, 'facingMode' | 'scanIntervalMs'>> & LiveScannerOptions;

  constructor(options: LiveScannerOptions) {
    this.options = {
      facingMode: 'environment',
      scanIntervalMs: 180,
      ...options,
    };
  }

  static isSupported() {
    return typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      'BarcodeDetector' in window;
  }

  async start(video: HTMLVideoElement) {
    if (!LiveScanner.isSupported()) {
      throw new Error('Este dispositivo/navegador no admite lectura de códigos en vivo.');
    }

    this.stop();
    this.video = video;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: this.options.facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    video.srcObject = this.stream;
    video.setAttribute('playsinline', 'true');
    await video.play();

    const Detector = (window as unknown as {
      BarcodeDetector: new (options?: { formats?: string[] }) => {
        detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string; format?: string }>>;
      };
    }).BarcodeDetector;

    const detector = new Detector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
    });

    const scan = async () => {
      if (!this.video || !this.stream?.active) return;
      try {
        const results = await detector.detect(this.video);
        const now = Date.now();
        for (const result of results) {
          const value = result.rawValue?.trim();
          if (!value) continue;
          // Debounce the same code while it remains in front of the camera.
          if (value === this.lastValue && now - this.lastDetectedAt < 1400) continue;
          this.lastValue = value;
          this.lastDetectedAt = now;
          this.options.onDetect({ rawValue: value, format: result.format });
          break;
        }
      } catch (error) {
        this.options.onError?.(error);
      }
    };

    this.timer = window.setInterval(scan, this.options.scanIntervalMs);
    await scan();
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }
}
