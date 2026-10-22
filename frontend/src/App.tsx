import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import {
  DEFAULT_SETTINGS, FRACTAL_TYPES, PALETTES,
  type FractalRequest, type FractalType, type Palette, type PaletteParameters
} from './types';
import { PRESETS } from './presets';
import { normalizedSquare, zoomAt, zoomRectangle, type Point } from './geometry';

function loadInitialSettings(): FractalRequest {
  try {
    const encoded = new URLSearchParams(window.location.search).get('state');
    if (!encoded || encoded.length > 10000) return DEFAULT_SETTINGS;
    const loaded = JSON.parse(encoded) as Partial<FractalRequest>;
    if (!loaded || typeof loaded !== 'object') return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...loaded,
      paletteParameters: { ...DEFAULT_SETTINGS.paletteParameters, ...loaded.paletteParameters }
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function formatNumber(n: number): string {
  return Number.isFinite(n) ? Number(n.toPrecision(11)).toString() : '?';
}

function NumericInput(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  hint?: string;
}) {
  return <label className="field">
    <span className="field-name">{props.label}</span>
    <input type="number" value={props.value} step={props.step ?? 'any'} min={props.min} max={props.max}
      onChange={event => props.onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
    {props.hint && <small>{props.hint}</small>}
  </label>;
}

function BrandMark() {
  return <span className="brand-symbol" aria-hidden="true">
    <svg viewBox="0 0 48 48" fill="none" width="30" height="30">
      <path d="M24 4 C38 2 45 14 42 27 C39 43 21 48 9 37 C-1 28 6 12 18 13 C30 15 32 28 25 33 C18 38 12 28 17 23 C21 19 26 22 24 27"
        stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  </span>;
}

const paletteColors: Record<string, string> = {
  aurora: 'linear-gradient(90deg,#122b66,#a441b1,#f6d498)',
  ember: 'linear-gradient(90deg,#24184b,#e74842,#fff2bb)',
  ice: 'linear-gradient(90deg,#10366a,#42c4cd,#f3fcff)',
  'purple-haze': 'linear-gradient(90deg,#13081b,#793392,#e17ae9)',
  'rhapsody-in-blue': 'linear-gradient(90deg,#050520,#1415d9,#647aff)',
  'just-the-set': 'linear-gradient(90deg,#000 30%,#fff 30%)',
  line: 'linear-gradient(90deg,#111,#fff)',
  circle: 'linear-gradient(90deg,#63b8ff,#e691c5,#d6ecff)',
  waves: 'linear-gradient(90deg,#121320,#ce71cc,#f9fdff)',
  'rgb-modifier': 'linear-gradient(90deg,red,lime,blue)'
};

export default function App() {
  const [settings, setSettings] = useState<FractalRequest>(loadInitialSettings);
  const [rendered, setRendered] = useState<FractalRequest | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<FractalRequest[]>([]);
  const [drag, setDrag] = useState<{ start: Point; end: Point } | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>('mandelbrot');
  const [lastMs, setLastMs] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const seqRef = useRef(0);

  const render = useCallback(async (next: FractalRequest) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++seqRef.current;
    const start = performance.now();
    setError('');
    setNotice('');
    setRendering(true);
    try {
      const response = await fetch('/api/fractals/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
        signal: controller.signal
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { errors?: unknown; title?: string } | null;
        const details = Array.isArray(body?.errors) ? body.errors.join(' ')
          : (body?.title || `Renderer returned HTTP ${response.status}`);
        throw new Error(details);
      }
      const blob = await response.blob();
      if (controller.signal.aborted || id !== seqRef.current) return;
      const url = URL.createObjectURL(blob);
      const previous = objectUrlRef.current;
      objectUrlRef.current = url;
      setImageUrl(url);
      setRendered(next);
      setLastMs(Math.round(performance.now() - start));
      if (previous) URL.revokeObjectURL(previous);
    } catch (reason) {
      if (controller.signal.aborted || id !== seqRef.current) return;
      setError(reason instanceof Error ? reason.message : 'The render failed.');
    } finally {
      if (id === seqRef.current) setRendering(false);
    }
  }, []);

  useEffect(() => {
    void render(loadInitialSettings());
    return () => {
      controllerRef.current?.abort();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [render]);

  const isDirty = useMemo(() => rendered !== null && JSON.stringify(rendered) !== JSON.stringify(settings), [rendered, settings]);
  const update = <K extends keyof FractalRequest>(key: K, value: FractalRequest[K]) => {
    setSettings(current => ({ ...current, [key]: value }));
    setActivePreset(null);
  };
  const updatePalette = <K extends keyof PaletteParameters>(key: K, value: PaletteParameters[K]) => {
    setSettings(current => ({ ...current, paletteParameters: { ...current.paletteParameters, [key]: value } }));
    setActivePreset(null);
  };
  const selectPreset = (preset: (typeof PRESETS)[number]) => {
    const next = structuredClone(preset.settings);
    setHistory([]);
    setSettings(next);
    setActivePreset(preset.id);
    void render(next);
  };
  const applyViewport = (next: FractalRequest) => {
    const old = rendered ?? settings;
    setHistory(items => [...items.slice(-24), old]);
    setSettings(next);
    setActivePreset(null);
    void render(next);
  };
  const goBack = () => {
    if (!history.length) return;
    const prior = history[history.length - 1];
    setHistory(items => items.slice(0, -1));
    setSettings(prior);
    setActivePreset(null);
    void render(prior);
  };
  const zoomBy = (factor: number) => {
    const base = rendered ?? settings;
    applyViewport(zoomAt(base, factor));
  };
  const resetView = () => {
    const preset = PRESETS.find(p => p.id === activePreset)?.settings
      ?? PRESETS.find(p => p.settings.type === settings.type)?.settings
      ?? DEFAULT_SETTINGS;
    const centreY = (preset.yMin + preset.yMax) / 2;
    const halfHeight = (preset.xMax - preset.xMin) * settings.height / settings.width / 2;
    const next = { ...settings, xMin: preset.xMin, xMax: preset.xMax, yMin: centreY - halfHeight, yMax: centreY + halfHeight };
    applyViewport(next);
  };
  const download = () => {
    if (!imageUrl || !rendered) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `fracgen-${rendered.type}-${rendered.width}x${rendered.height}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('state', JSON.stringify(settings));
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice('Link copied. It contains your current settings.');
    } catch {
      setNotice('Clipboard unavailable. Copy the link from the address bar instead.');
      window.history.replaceState(null, '', url);
    }
  };
  const getRelativePoint = (event: ReactPointerEvent<HTMLDivElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    };
  };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !imageUrl || rendering) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = getRelativePoint(event);
    setDrag({ start, end: start });
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag(old => old ? { ...old, end: getRelativePoint(event) } : null);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const selection = normalizedSquare(drag.start, getRelativePoint(event));
    setDrag(null);
    if (selection.width > 0.018 && selection.height > 0.018) {
      applyViewport(zoomRectangle(rendered ?? settings, selection));
    }
  };

  const selection = drag ? normalizedSquare(drag.start, drag.end) : null;
  const fractalInfo = FRACTAL_TYPES.find(type => type.value === (rendered?.type ?? settings.type))!;
  const isJulia = settings.type !== 'mandelbrot';
  const palette = settings.palette;
  const needsLine = ['line', 'waves'].includes(palette);
  const needsCircle = ['circle', 'waves'].includes(palette);
  const needsRgb = palette === 'rgb-modifier';

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><BrandMark /><div><strong>FracGen</strong><span>FRACTAL EXPLORER</span></div><span className="brand-version">WEB</span></div>
      <div className="sidebar-scroll">
        <div className="sidebar-intro">
          <span className="overline">THE GENERATOR</span>
          <h2>Shape the infinite.</h2>
          <p>Five original algorithms. Seven classic colour schemes. Endless detail.</p>
        </div>

        <section className="control-section">
          <div className="section-header"><span>01</span><h3>Fractal</h3></div>
          <label className="field"><span className="field-name">Equation</span>
            <select value={settings.type} onChange={e => update('type', e.target.value as FractalType)}>
              {FRACTAL_TYPES.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </label>
          {isJulia && <div className="field-pair">
            <NumericInput label="c · Real" value={settings.cReal} onChange={v => update('cReal', v)} step="any" />
            <NumericInput label="c · Imaginary" value={settings.cImag} onChange={v => update('cImag', v)} step="any" />
          </div>}
          <div className="field-pair">
            <NumericInput label="Iterations (K)" value={settings.iterations} onChange={v => update('iterations', v)} min={1} max={2000} step={1} />
            <NumericInput label="Bailout (M)" value={settings.bailout} onChange={v => update('bailout', v)} min={1} max={1999} step={1} />
          </div>
        </section>

        <section className="control-section">
          <div className="section-header"><span>02</span><h3>Colour</h3></div>
          <label className="field"><span className="field-name">Colour scheme</span>
            <select value={palette} onChange={e => update('palette', e.target.value as Palette)}>
              {PALETTES.map(item => <option key={item.value} value={item.value}>{item.label}{item.original ? ' · Original' : ' · Modern'}</option>)}
            </select>
          </label>
          <div className="palette-preview" style={{ background: paletteColors[palette] }} aria-label={`${palette} colour palette`} />
          {needsLine && <div className="advanced-fields">
            <h4>Line endpoints <span>RGB 0–255</span></h4>
            {(['lineStart', 'lineEnd'] as const).map(key => <div className="rgb-row" key={key}>
              <span>{key === 'lineStart' ? 'From' : 'To'}</span>
              {settings.paletteParameters[key].map((value, i) => <input aria-label={`${key} channel ${i + 1}`} key={i}
                type="number" min="0" max="255" value={value}
                onChange={e => {
                  const colors = [...settings.paletteParameters[key]] as [number, number, number];
                  colors[i] = Number(e.target.value);
                  updatePalette(key, colors);
                }} />)}
            </div>)}
          </div>}
          {needsCircle && <div className="advanced-fields">
            <h4>Circle settings <span>RGB space</span></h4>
            <div className="field-pair">
              <NumericInput label="Centre R" value={settings.paletteParameters.circleX} onChange={v => updatePalette('circleX', v)} min={0} max={255} />
              <NumericInput label="Centre G" value={settings.paletteParameters.circleY} onChange={v => updatePalette('circleY', v)} min={0} max={255} />
              <NumericInput label="Radius" value={settings.paletteParameters.circleRadius} onChange={v => updatePalette('circleRadius', v)} min={1} max={127} />
              <NumericInput label="Blue (Z)" value={settings.paletteParameters.circleBlue} onChange={v => updatePalette('circleBlue', v)} min={0} max={255} />
            </div>
          </div>}
          {needsRgb && <div className="advanced-fields">
            <h4>RGB multipliers <span>0–255</span></h4>
            <div className="field-triple">
              <NumericInput label="Red" value={settings.paletteParameters.rgbR} onChange={v => updatePalette('rgbR', v)} min={0} max={255} />
              <NumericInput label="Green" value={settings.paletteParameters.rgbG} onChange={v => updatePalette('rgbG', v)} min={0} max={255} />
              <NumericInput label="Blue" value={settings.paletteParameters.rgbB} onChange={v => updatePalette('rgbB', v)} min={0} max={255} />
            </div>
          </div>}
        </section>

        <section className="control-section">
          <div className="section-header"><span>03</span><h3>Image &amp; coordinates</h3></div>
          <div className="field-pair">
            <NumericInput label="Width · px" value={settings.width} onChange={v => update('width', v)} min={100} max={1600} step={1} />
            <NumericInput label="Height · px" value={settings.height} onChange={v => update('height', v)} min={100} max={1200} step={1} />
          </div>
          <details className="details"><summary>Advanced viewport coordinates <span>⌄</span></summary>
            <div className="field-pair details-body">
              <NumericInput label="Real min" value={settings.xMin} onChange={v => update('xMin', v)} />
              <NumericInput label="Real max" value={settings.xMax} onChange={v => update('xMax', v)} />
              <NumericInput label="Imaginary min" value={settings.yMin} onChange={v => update('yMin', v)} />
              <NumericInput label="Imaginary max" value={settings.yMax} onChange={v => update('yMax', v)} />
            </div>
          </details>
        </section>
      </div>
      <div className="sidebar-footer">
        {isDirty && <span className="pending-note">● Settings changed — render to apply</span>}
        <button className="primary-button" disabled={rendering} onClick={() => void render(settings)}>
          <span>{rendering ? '◌' : '✦'}</span> {rendering ? 'Rendering…' : 'Generate fractal'} <span className="button-arrow">↗</span>
        </button>
        <span className="keyboard-note">Generates a PNG using the C# rendering engine</span>
      </div>
    </aside>

    <main className="workspace">
      <header className="topbar">
        <div><span className="overline">EXPLORER / COMPLEX PLANE</span><h1>Into the infinite<span>.</span></h1></div>
        <a href="https://github.com/Agmash29a/FracGen" target="_blank" rel="noreferrer" className="source-link">⌁ Original VB6 source ↗</a>
      </header>

      <div className="content-area">
        <section className="presets-section">
          <div className="eyebrow-row"><span>START EXPLORING</span><span className="eyebrow-muted">CURATED VIEWS</span></div>
          <div className="preset-strip">
            {PRESETS.map((preset, index) => <button type="button" key={preset.id}
              className={`preset-tile ${activePreset === preset.id ? 'selected' : ''}`}
              onClick={() => selectPreset(preset)}>
              <span className="preset-index">0{index + 1}</span><strong>{preset.title}</strong><small>{preset.subtitle}</small>
            </button>)}
          </div>
        </section>

        <section className="image-panel">
          <div className="panel-top">
            <div><div className="status-dot" /><span className="panel-label">FRACTAL CANVAS</span><span className="panel-separator">/</span><span className="panel-name">{fractalInfo.label}</span></div>
            <div className="panel-tools">
              <button type="button" title="Previous viewport" onClick={goBack} disabled={!history.length || rendering}>↶ <span>Back</span></button>
              <button type="button" title="Zoom out 2×" onClick={() => zoomBy(2)} disabled={!imageUrl || rendering}>−</button>
              <button type="button" title="Zoom in 2×" onClick={() => zoomBy(0.5)} disabled={!imageUrl || rendering}>＋</button>
              <button type="button" title="Reset viewport" onClick={resetView} disabled={rendering}><span>Reset view</span> ⟲</button>
            </div>
          </div>

          <div className="canvas-surround">
            <div className="canvas-frame" style={{ '--image-ratio': String((rendered ?? settings).width / (rendered ?? settings).height) } as CSSProperties}>
              {imageUrl ? <img draggable={false} src={imageUrl} alt={`Generated ${fractalInfo.label} fractal`} className="fractal-image" /> : <div className="image-empty"><BrandMark /><span>The infinite awaits</span></div>}
              {rendering && <div className="render-overlay"><span className="loader" /><strong>Exploring the complex plane</strong><small>Calculating each pixel on the server…</small></div>}
              {imageUrl && <div className="image-pointer-layer" role="img" aria-label="Drag a rectangle over the fractal to zoom in"
                onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
                onPointerCancel={() => setDrag(null)} />}
              {selection && <div className="selection-rectangle" style={{ left: `${selection.left * 100}%`, top: `${selection.top * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }} />}
            </div>
          </div>
          <div className="panel-bottom">
            <span><span className="guide-symbol">⌖</span> Drag to select an area and zoom in</span>
            <span className="render-stats">{rendered ? `${rendered.width} × ${rendered.height} · ${rendered.iterations} iterations${lastMs !== null ? ` · ${(lastMs / 1000).toFixed(1)}s` : ''}` : 'No render yet'}</span>
          </div>
        </section>

        {error && <div className="message error" role="alert"><strong>Render failed</strong><span>{error}</span><small>Make sure the ASP.NET Core API is running on port 5082.</small></div>}
        {notice && <div className="message notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}

        <div className="bottom-layout">
          <div className="coordinate-card">
            <div className="eyebrow-row"><span>VIEWPORT COORDINATES</span><span className="eyebrow-muted">ℂ</span></div>
            <div className="coordinate-grid">
              <div><small>REAL AXIS</small><strong>{formatNumber((rendered ?? settings).xMin)} <span>to</span> {formatNumber((rendered ?? settings).xMax)}</strong></div>
              <div><small>IMAGINARY AXIS</small><strong>{formatNumber((rendered ?? settings).yMin)} <span>to</span> {formatNumber((rendered ?? settings).yMax)}</strong></div>
            </div>
          </div>
          <div className="export-card">
            <div className="eyebrow-row"><span>KEEP YOUR DISCOVERY</span></div>
            <div className="export-actions">
              <button type="button" className="secondary-button" disabled={!imageUrl} onClick={download}>↓ Download PNG</button>
              <button type="button" className="secondary-button" onClick={() => void copyLink()}>↗ Share settings</button>
            </div>
          </div>
        </div>
        <footer className="main-footer"><span>FRACGEN / A MODERN REIMAGINING OF THE ORIGINAL VB6 FRACTAL GENERATOR</span><span>BUILT WITH REACT + ASP.NET CORE</span></footer>
      </div>
    </main>
  </div>;
}
