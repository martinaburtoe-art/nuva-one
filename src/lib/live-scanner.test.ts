import { describe, expect, it } from 'vitest';
import { LiveScanner } from './live-scanner';

describe('LiveScanner', () => {
  it('exposes the expected live barcode formats', () => {
    expect(LiveScanner.supportedFormats()).toEqual([
      'ean_13',
      'ean_8',
      'upc_a',
      'upc_e',
      'code_128',
      'code_39',
      'itf',
      'qr_code',
    ]);
  });

  it('does not claim camera support when getUserMedia is unavailable', () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });

    expect(LiveScanner.hasCameraSupport()).toBe(false);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('reports native barcode support only when BarcodeDetector exists', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });

    expect(LiveScanner.hasNativeBarcodeDetector()).toBe(false);

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  });
});
