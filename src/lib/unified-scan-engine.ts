import { LiveScanner, type LiveScanResult, type LiveScannerOptions } from '@/lib/live-scanner';

export type ScanInput = 'camera' | 'hid' | 'native';

export type UnifiedScanResult = LiveScanResult & {
  input: ScanInput;
  timestamp: number;
};

export type UnifiedScanEngineOptions = Omit<LiveScannerOptions, 'onDetect'> & {
  onDetect: (result: UnifiedScanResult) => void;
  hidEnabled?: boolean;
};

const HID_TERMINATORS = new Set(['Enter', 'Tab']);

/**
 * Unified input layer. Camera, native and keyboard/HID readers all emit the same
 * normalized scan event; product resolution remains the responsibility of the caller.
 */
export class UnifiedScanEngine {
  private readonly scanner: LiveScanner;
  private readonly options: UnifiedScanEngineOptions;
  private hidBuffer = '';
  private hidStartedAt = 0;
  private hidListener: ((event: KeyboardEvent) => void) | null = null;
  private stopped = true;

  constructor(options: UnifiedScanEngineOptions) {
    this.options = { hidEnabled: true, ...options };
    this.scanner = new LiveScanner({
      ...options,
      onDetect: (result) => this.emit(result, 'camera'),
    });
  }

  private emit(result: LiveScanResult, input: ScanInput) {
    const rawValue = result.rawValue.trim();
    if (!rawValue) return;
    this.options.onDetect({ ...result, rawValue, input, timestamp: Date.now() });
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (!this.options.hidEnabled || this.stopped) return;
    const now = Date.now();
    if (this.hidStartedAt && now - this.hidStartedAt > 120) {
      this.hidBuffer = '';
      this.hidStartedAt = 0;
    }
    if (HID_TERMINATORS.has(event.key)) {
      const value = this.hidBuffer.trim();
      this.hidBuffer = '';
      this.hidStartedAt = 0;
      if (value.length >= 3) {
        event.preventDefault();
        this.emit({ rawValue: value }, 'hid');
      }
      return;
    }
    if (event.key.length !== 1) return;
    if (!this.hidStartedAt) this.hidStartedAt = now;
    this.hidBuffer += event.key;
  };

  startHid() {
    if (!this.options.hidEnabled || typeof window === 'undefined' || this.hidListener) return;
    this.hidListener = this.handleKeydown;
    window.addEventListener('keydown', this.hidListener, { capture: true });
  }

  stopHid() {
    if (typeof window !== 'undefined' && this.hidListener) {
      window.removeEventListener('keydown', this.hidListener, { capture: true });
    }
    this.hidListener = null;
    this.hidBuffer = '';
    this.hidStartedAt = 0;
  }

  async start(video: HTMLVideoElement) {
    this.stopped = false;
    this.startHid();
    await this.scanner.start(video);
  }

  emitNative(rawValue: string, format?: string) {
    if (this.stopped) return;
    this.emit({ rawValue, format }, 'native');
  }

  getStream() { return this.scanner.getStream(); }
  getVideoTrack() { return this.scanner.getVideoTrack(); }
  getTorchState() { return this.scanner.getTorchState(); }
  setTorch(enabled: boolean) { return this.scanner.setTorch(enabled); }
  stop() {
    this.stopped = true;
    this.stopHid();
    this.scanner.stop();
  }
}
