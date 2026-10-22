import type { FractalRequest } from './types';

export interface Point { x: number; y: number }
export interface Rectangle { left: number; top: number; width: number; height: number }

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Construct a normalised rectangle with the image's exact aspect ratio. */
export function normalizedSquare(start: Point, end: Point): Rectangle {
  const length = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  const sx = Math.sign(end.x - start.x) || 1;
  const sy = Math.sign(end.y - start.y) || 1;
  const x2 = clamp01(start.x + sx * length);
  const y2 = clamp01(start.y + sy * length);
  return {
    left: Math.min(start.x, x2),
    top: Math.min(start.y, y2),
    width: Math.abs(x2 - start.x),
    height: Math.abs(y2 - start.y)
  };
}

/** The fractal plane's imaginary component decreases down the screen. */
export function zoomRectangle(settings: FractalRequest, selection: Rectangle): FractalRequest {
  if (selection.width < 0.01 || selection.height < 0.01) return settings;
  const dx = settings.xMax - settings.xMin;
  const dy = settings.yMax - settings.yMin;
  return {
    ...settings,
    xMin: settings.xMin + dx * selection.left,
    xMax: settings.xMin + dx * (selection.left + selection.width),
    yMax: settings.yMax - dy * selection.top,
    yMin: settings.yMax - dy * (selection.top + selection.height)
  };
}

export function zoomAt(settings: FractalRequest, factor: number, point: Point = { x: 0.5, y: 0.5 }): FractalRequest {
  const x = clamp01(point.x), y = clamp01(point.y);
  const spanX = (settings.xMax - settings.xMin) * factor;
  const spanY = (settings.yMax - settings.yMin) * factor;
  const centreX = settings.xMin + x * (settings.xMax - settings.xMin);
  const centreY = settings.yMax - y * (settings.yMax - settings.yMin);
  return {
    ...settings,
    xMin: centreX - x * spanX,
    xMax: centreX + (1 - x) * spanX,
    yMin: centreY - (1 - y) * spanY,
    yMax: centreY + y * spanY
  };
}
