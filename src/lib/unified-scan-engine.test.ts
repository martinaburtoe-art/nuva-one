import { describe, expect, it, vi } from 'vitest';
import { UnifiedScanEngine } from './unified-scan-engine';

describe('UnifiedScanEngine', () => {
  it('emits native scans through the same normalized contract', () => {
    const onDetect = vi.fn();
    const engine = new UnifiedScanEngine({ onDetect });
    engine.emitNative('  7801234567890  ', 'EAN_13');
    expect(onDetect).toHaveBeenCalledTimes(1);
    expect(onDetect).toHaveBeenCalledWith(expect.objectContaining({ rawValue: '7801234567890', format: 'EAN_13', input: 'native', timestamp: expect.any(Number) }));
    engine.stop();
  });

  it('ignores empty native values', () => {
    const onDetect = vi.fn();
    const engine = new UnifiedScanEngine({ onDetect });
    engine.emitNative('   ');
    expect(onDetect).not.toHaveBeenCalled();
    engine.stop();
  });
});
