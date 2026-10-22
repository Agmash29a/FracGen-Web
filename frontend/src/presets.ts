import { DEFAULT_SETTINGS, ORIGINAL_SETTINGS, type FractalRequest } from './types';

export const PRESETS: { id: string; title: string; subtitle: string; settings: FractalRequest }[] = [
  {
    id: 'mandelbrot', title: 'Mandelbrot', subtitle: 'The classic set',
    settings: { ...DEFAULT_SETTINGS }
  },
  {
    id: 'seahorse', title: 'Seahorse Valley', subtitle: 'Deep zoom',
    settings: {
      ...DEFAULT_SETTINGS, palette: 'ember', iterations: 350,
      xMin: -0.758, xMax: -0.726, yMin: 0.121, yMax: 0.121 + 0.032 * 2 / 3
    }
  },
  {
    id: 'julia', title: 'Julia', subtitle: 'Quadratic',
    settings: {
      ...DEFAULT_SETTINGS, type: 'julia-quadratic', palette: 'ice',
      xMin: -2.25, xMax: 2.25, yMin: -1.5, yMax: 1.5
    }
  },
  {
    id: 'exponential', title: 'Exponential', subtitle: 'Julia eᶻ + c',
    settings: {
      ...DEFAULT_SETTINGS, type: 'julia-exponential', palette: 'aurora',
      xMin: -3, xMax: 3, yMin: -2, yMax: 2
    }
  },
  {
    id: 'sine', title: 'Sine + Exp', subtitle: 'Julia sin(z)+eᶻ+c',
    settings: {
      ...DEFAULT_SETTINGS, type: 'julia-sine-exponential', palette: 'ember',
      xMin: -3, xMax: 3, yMin: -2, yMax: 2
    }
  },
  {
    id: 'cexp', title: 'c × Exp', subtitle: 'Julia c·eᶻ',
    settings: {
      ...DEFAULT_SETTINGS, type: 'julia-cexp', palette: 'ice',
      xMin: -3, xMax: 3, yMin: -2, yMax: 2
    }
  },
  { id: 'original', title: 'VB6 Original', subtitle: '1990s defaults', settings: ORIGINAL_SETTINGS }
];
