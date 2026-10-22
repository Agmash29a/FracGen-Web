# FracGen Web

A React + TypeScript + ASP.NET Core reimplementation of [Agmash29a/FracGen](https://github.com/Agmash29a/FracGen), the original Visual Basic 6 fractal generator.

The C# engine implements **all five source algorithms** and **all seven original colour schemes**, plus three new smooth-gradient schemes. Unlike a generic Mandelbrot demo, it retains the original squared-modulus bailout variable `M`, iteration limit `K`, Julia constants, y-axis orientation, palette formulas and original 500×500 defaults (accessible through the **VB6 Original** preset).

## Requirements

- **.NET 10 SDK**: https://dotnet.microsoft.com/download/dotnet/10.0
- **Node.js 22+**: https://nodejs.org/
- Windows, macOS or Linux. The backend has no extra production NuGet packages and does not rely on System.Drawing.

## Run locally (Windows PowerShell)

Open **two** terminals in the project root.

**Terminal 1 — ASP.NET Core API**

```powershell
dotnet run --project .\backend\FracGen.Api\FracGen.Api.csproj --launch-profile FracGen.Api
```

API health check: http://localhost:5082/api/health

**Terminal 2 — React frontend**

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to `http://localhost:5082`; no CORS configuration or environment variables are needed.

The initial render starts automatically when the page loads. Adjust controls and press **Generate fractal**, or select a preset. Click and drag on the image to zoom while preserving its aspect ratio. Use **Back**, **+**, **−**, **Reset view**, **Download PNG** and **Share settings**.

### Production via Docker (optional)

From the project root:

```powershell
docker build -t fracgen-web .
docker run --rm -p 8080:8080 fracgen-web
```

Open http://localhost:8080. The multi-stage Dockerfile builds Vite into ASP.NET Core `wwwroot`, so only one server/container is needed for production.

### Tests

```powershell
dotnet test .\tests\FracGen.Api.Tests\FracGen.Api.Tests.csproj
cd frontend
npm test
```

The C# tests check black interior pixels, PNG format and request validation. The Vitest tests check viewport and screen-to-complex-plane transformations.

## Architecture

```text
frontend/src/App.tsx                 React controls, presets, zoom interaction and image download
frontend/src/geometry.ts            Pixel-to-complex-plane coordinate calculations
frontend/src/types.ts               Shared UI request schema and VB6 default settings
frontend/src/presets.ts             One-click fractal presets
backend/FracGen.Api/Program.cs      POST /api/fractals/render, GET /api/health, static SPA hosting
backend/FracGen.Api/Fractals/FractalRequest.cs     Validation and render parameters
backend/FracGen.Api/Fractals/FractalRenderer.cs    Pixel-wise C# renderer and classic palettes
backend/FracGen.Api/Imaging/PngEncoder.cs         Zero-dependency cross-platform PNG encoder
tests/FracGen.Api.Tests             xUnit tests
```

The React client sends JSON to `POST /api/fractals/render` and receives `image/png`. For large resolutions, client cancellation is forwarded into the C# render. An upper bound on pixel × iteration work prevents pathological jobs.

Example (PowerShell):

```powershell
$payload = @{
  type = 'mandelbrot'
  palette = 'purple-haze'
  width = 500
  height = 500
  iterations = 100
  bailout = 200
  xMin = -2
  xMax = 2
  yMin = -2
  yMax = 2
  cReal = -0.194
  cImag = 0.6557
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:5082/api/fractals/render' -Method Post `
  -ContentType 'application/json' -Body $payload -OutFile mandelbrot.png
```

The server supplies palette parameter defaults when `paletteParameters` is omitted.

## Porting reference

| Source VB6 code | Modern code |
|---|---|
| `CLASS_Mandelbrot.cls` | `FractalRenderer.cs` |
| `CLASS_ComplexArithmetic.cls` | Explicit complex-number arithmetic with `System.Math` |
| `CLASS_Settings.cls` / `MODULE_Globals.bas` | `FractalRequest.cs` / `types.ts` |
| `FORM_MainScreen.frm` / `FORM_Settings.frm` | `App.tsx` |
| Windows `SetPixelV` + BMP | RGBA byte buffer + PNG |

| Original algorithm | Request type |
|---|---|
| Mandelbrot `z²+c`, with `z₀=0` and pixel defining `c` | `mandelbrot` |
| Julia `z²+c` | `julia-quadratic` |
| Julia `eᶻ+c` | `julia-exponential` |
| Julia `sin(z)+eᶻ+c` | `julia-sine-exponential` |
| Julia `c·eᶻ` | `julia-cexp` |

Original palette names: `purple-haze`, `rhapsody-in-blue`, `just-the-set`, `line`, `circle`, `waves`, `rgb-modifier`. Modern additions: `aurora`, `ember`, `ice`.

**Intentional improvements:** configurable image sizes, responsive UI, drag-to-zoom, viewport history, downloadable PNG, shareable URLs, API validation/cancellation and optional deployment in one container. New palette gradients use smooth colouring. All legacy palettes use their original integer iteration counts; the original VB6 `JustTheSet` leaves escaped pixels white, reproduced here explicitly.

**Precision note:** Like the VB6 original, the renderer uses IEEE 754 `double`, so deep zoom eventually reaches a floating-point precision limit. A future arbitrary-precision engine would be needed for extreme zoom depths. The original code also used VB6 `Round` (banker's rounding), which is reproduced with `MidpointRounding.ToEven`.

**Security note:** This is a development starter. Before exposing a public render API, implement authentication/rate limiting, deployment observability and additional request/cpu quotas.

## Build verification

The project was written against the .NET 10 and React 19 API surfaces. The creation environment did not have a .NET SDK or access to the npm registry, so a full `dotnet build` / `npm run build` was **not possible here**. Run the commands above to compile and execute on your machine. The code is supplied in source form with tests and a Dockerfile, not as a claimed tested binary.
