import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './types';
import { normalizedSquare, zoomAt, zoomRectangle } from './geometry';

describe('zoom controls', () => {
  it('keeps the centre when zooming into the centre', () => {
    const next = zoomAt(DEFAULT_SETTINGS, 0.5);
    expect((next.xMin + next.xMax) / 2).toBeCloseTo((DEFAULT_SETTINGS.xMin + DEFAULT_SETTINGS.xMax) / 2);
    expect(next.xMax - next.xMin).toBeCloseTo((DEFAULT_SETTINGS.xMax - DEFAULT_SETTINGS.xMin) / 2);
  });

  it('maps top-of-screen to the greatest imaginary coordinate', () => {
    const next = zoomRectangle(DEFAULT_SETTINGS, { left: 0, top: 0, width: 0.5, height: 0.5 });
    expect(next.yMax).toBeCloseTo(DEFAULT_SETTINGS.yMax);
    expect(next.yMin).toBeCloseTo(0);
  });

  it('normalises drag selection without changing aspect ratio', () => {
    const r = normalizedSquare({ x: 0.7, y: 0.7 }, { x: 0.3, y: 0.5 });
    expect(r.width).toBeCloseTo(r.height);
    expect(r.left).toBeCloseTo(0.5);
    expect(r.top).toBeCloseTo(0.5);
  });
});
