export type FractalType =
  | 'mandelbrot'
  | 'julia-quadratic'
  | 'julia-exponential'
  | 'julia-sine-exponential'
  | 'julia-cexp';

export type Palette =
  | 'purple-haze'
  | 'rhapsody-in-blue'
  | 'just-the-set'
  | 'line'
  | 'circle'
  | 'waves'
  | 'rgb-modifier'
  | 'aurora'
  | 'ember'
  | 'ice';

export interface PaletteParameters {
  lineStart: [number, number, number];
  lineEnd: [number, number, number];
  circleX: number;
  circleY: number;
  circleRadius: number;
  circleBlue: number;
  rgbR: number;
  rgbG: number;
  rgbB: number;
}

export interface FractalRequest {
  type: FractalType;
  palette: Palette;
  width: number;
  height: number;
  iterations: number;
  bailout: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  cReal: number;
  cImag: number;
  paletteParameters: PaletteParameters;
}

export const DEFAULT_PALETTE_PARAMETERS: PaletteParameters = {
  lineStart: [0, 0, 0],
  lineEnd: [255, 255, 255],
  circleX: 127,
  circleY: 127,
  circleRadius: 127,
  circleBlue: 127,
  rgbR: 1,
  rgbG: 1,
  rgbB: 1
};

export const DEFAULT_SETTINGS: FractalRequest = {
  type: 'mandelbrot',
  palette: 'aurora',
  width: 900,
  height: 600,
  iterations: 180,
  bailout: 200,
  xMin: -2.6,
  xMax: 1.4,
  yMin: -4 / 3,
  yMax: 4 / 3,
  cReal: -0.194,
  cImag: 0.6557,
  paletteParameters: { ...DEFAULT_PALETTE_PARAMETERS }
};

// The original VB6 constants from MODULE_Globals.bas and FORM_MainScreen.frm.
export const ORIGINAL_SETTINGS: FractalRequest = {
  ...DEFAULT_SETTINGS,
  palette: 'purple-haze',
  width: 500,
  height: 500,
  iterations: 100,
  bailout: 200,
  xMin: -2,
  xMax: 2,
  yMin: -2,
  yMax: 2
};

export const FRACTAL_TYPES: { value: FractalType; label: string; equation: string }[] = [
  { value: 'mandelbrot', label: 'Mandelbrot', equation: 'z² + c' },
  { value: 'julia-quadratic', label: 'Julia · Quadratic', equation: 'z² + c' },
  { value: 'julia-exponential', label: 'Julia · Exponential', equation: 'eᶻ + c' },
  { value: 'julia-sine-exponential', label: 'Julia · Sine + Exp', equation: 'sin(z) + eᶻ + c' },
  { value: 'julia-cexp', label: 'Julia · c × Exp', equation: 'c × eᶻ' }
];

export const PALETTES: { value: Palette; label: string; original?: boolean }[] = [
  { value: 'aurora', label: 'Aurora' },
  { value: 'ember', label: 'Ember' },
  { value: 'ice', label: 'Ice' },
  { value: 'purple-haze', label: 'Purple Haze', original: true },
  { value: 'rhapsody-in-blue', label: 'Rhapsody in Blue', original: true },
  { value: 'just-the-set', label: 'Just the Set', original: true },
  { value: 'line', label: 'Line Through Colour Space', original: true },
  { value: 'circle', label: 'Circle Through Colour Space', original: true },
  { value: 'waves', label: 'Waves', original: true },
  { value: 'rgb-modifier', label: 'RGB Modifier', original: true }
];
