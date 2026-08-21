import { describe, expect, it } from 'vitest';
import { LiveScanner } from './live-scanner';

describe('LiveScanner', () => {
  it('declares the supported live barcode formats', () => {
    expect(LiveScanner.supportedFormats()).toEqual(expect.arrayContaining(['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code']));
  });

  it('does not require camera availability at module evaluation time', () => {
    expect(typeof LiveScanner.hasCameraSupport()).toBe('boolean');
    expect(typeof LiveScanner.hasNativeBarcodeDetector()).toBe('boolean');
  });
});
