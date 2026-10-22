namespace FracGen.Api.Fractals;

/// <summary>
/// Ports CLASS_Mandelbrot.cls from Agmash29a/FracGen. Each output pixel is RGBA.
/// Original behaviour retained: y decreases down the image; bailout compares |z|² to M;
/// escaped pixels use the exact integer escape count, interior pixels are black.
/// </summary>
public static class FractalRenderer
{
    public static byte[] Render(FractalRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var errors = request.Validate();
        if (errors.Count > 0)
            throw new ArgumentException(string.Join(" ", errors), nameof(request));

        var result = new byte[checked(request.Width * request.Height * 4)];
        var stepX = (request.XMax - request.XMin) / request.Width;
        var stepY = (request.YMax - request.YMin) / request.Height;

        for (var y = 0; y < request.Height; y++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var imaginary = request.YMax - stepY * y;
            for (var x = 0; x < request.Width; x++)
            {
                if ((x & 63) == 0) cancellationToken.ThrowIfCancellationRequested();
                var real = request.XMin + stepX * x;
                var mandelbrot = request.Type == "mandelbrot";
                var zr = mandelbrot ? 0.0 : real;
                var zi = mandelbrot ? 0.0 : imaginary;
                var cr = mandelbrot ? real : request.CReal;
                var ci = mandelbrot ? imaginary : request.CImag;
                var count = 0;

                while (count < request.Iterations && zr * zr + zi * zi < request.Bailout)
                {
                    double nextR, nextI;
                    switch (request.Type)
                    {
                        case "mandelbrot":
                        case "julia-quadratic":
                            nextR = zr * zr - zi * zi + cr;
                            nextI = 2 * zr * zi + ci;
                            break;

                        case "julia-exponential":
                            {
                                var exp = Math.Exp(zr);
                                nextR = exp * Math.Cos(zi) + cr;
                                nextI = exp * Math.Sin(zi) + ci;
                                break;
                            }

                        case "julia-sine-exponential":
                            {
                                // sin(a+bi) = sin(a)cosh(b) + i*cos(a)sinh(b)
                                var exp = Math.Exp(zr);
                                nextR = Math.Sin(zr) * Math.Cosh(zi) + exp * Math.Cos(zi) + cr;
                                nextI = Math.Cos(zr) * Math.Sinh(zi) + exp * Math.Sin(zi) + ci;
                                break;
                            }

                        case "julia-cexp":
                            {
                                var exp = Math.Exp(zr);
                                var er = exp * Math.Cos(zi);
                                var ei = exp * Math.Sin(zi);
                                nextR = cr * er - ci * ei;
                                nextI = cr * ei + ci * er;
                                break;
                            }

                        default:
                            throw new InvalidOperationException("Unhandled fractal type.");
                    }

                    count++;
                    zr = nextR;
                    zi = nextI;
                    if (!double.IsFinite(zr) || !double.IsFinite(zi)) break;
                }

                var color = Colorize(request, count, zr * zr + zi * zi);
                var offset = (y * request.Width + x) * 4;
                result[offset] = color.R;
                result[offset + 1] = color.G;
                result[offset + 2] = color.B;
                result[offset + 3] = 255;
            }
        }
        return result;
    }

    private static Rgb Colorize(FractalRequest p, int count, double magnitudeSquared)
    {
        if (count == p.Iterations) return new Rgb(0, 0, 0);
        var s = p.PaletteParameters;
        return p.Palette switch
        {
            "purple-haze" => new Rgb(Byte((count % 100) * 1.5), Byte((count % 100) * .5), Byte((count % 100) * 2.5)),
            "rhapsody-in-blue" => new Rgb(0, 0, Byte((count % 100) * 2.5)),
            "just-the-set" => new Rgb(255, 255, 255),
            "line" => Line(s, count / (double)p.Iterations),
            "circle" => Circle(s, count / (double)p.Iterations),
            "waves" => count % 2 == 1 && count < p.Iterations / 2.0
                ? Circle(s, count / (double)p.Iterations)
                : Line(s, count / (double)p.Iterations),
            "rgb-modifier" => new Rgb((byte)(count * s.RgbR % 256), (byte)(count * s.RgbG % 256), (byte)(count * s.RgbB % 256)),
            "ember" => Modern(count, p.Iterations, magnitudeSquared, Ember),
            "ice" => Modern(count, p.Iterations, magnitudeSquared, Ice),
            _ => Modern(count, p.Iterations, magnitudeSquared, Aurora)
        };
    }

    private static Rgb Line(PaletteParameters p, double t) => new(
        Byte(p.LineStart[0] + (p.LineEnd[0] - p.LineStart[0]) * t),
        Byte(p.LineStart[1] + (p.LineEnd[1] - p.LineStart[1]) * t),
        Byte(p.LineStart[2] + (p.LineEnd[2] - p.LineStart[2]) * t));

    private static Rgb Circle(PaletteParameters p, double t)
    {
        var theta = t * Math.Tau;
        return new Rgb(Byte(Math.Abs(p.CircleX + p.CircleRadius * Math.Cos(theta))),
                       Byte(Math.Abs(p.CircleY + p.CircleRadius * Math.Sin(theta))),
                       (byte)p.CircleBlue);
    }

    private static Rgb Modern(int count, int iterations, double magnitudeSquared, Rgb[] colors)
    {
        var smooth = (double)count;
        // Smooth colouring is a new feature; legacy schemes above keep exact iteration colours.
        if (magnitudeSquared > 1 && double.IsFinite(magnitudeSquared))
        {
            var log2 = Math.Log(magnitudeSquared) / 2.0;
            if (log2 > 0)
            {
                var correction = Math.Log(log2 / Math.Log(2)) / Math.Log(2);
                if (double.IsFinite(correction)) smooth = Math.Max(0, count + 1 - correction);
            }
        }
        var t = Math.Pow(Math.Clamp(smooth / iterations, 0.0, 1.0), 0.43);
        var segment = t * (colors.Length - 1);
        var i = Math.Min(colors.Length - 2, (int)segment);
        var u = Math.Clamp(segment - i, 0.0, 1.0);
        var a = colors[i];
        var b = colors[i + 1];
        return new Rgb(Byte(a.R + (b.R - a.R) * u),
                       Byte(a.G + (b.G - a.G) * u),
                       Byte(a.B + (b.B - a.B) * u));
    }

    private static readonly Rgb[] Aurora = [new(5, 9, 27), new(18, 43, 102), new(64, 46, 154), new(164, 65, 177), new(246, 136, 146), new(251, 212, 152)];
    private static readonly Rgb[] Ember = [new(7, 8, 24), new(36, 24, 75), new(139, 35, 94), new(231, 72, 66), new(255, 174, 76), new(255, 242, 187)];
    private static readonly Rgb[] Ice = [new(4, 14, 34), new(15, 46, 91), new(20, 107, 150), new(66, 196, 205), new(156, 230, 245), new(243, 252, 255)];

    private static byte Byte(double value) => (byte)Math.Clamp(Math.Round(value, MidpointRounding.ToEven), 0.0, 255.0);
    private readonly record struct Rgb(byte R, byte G, byte B);
}
