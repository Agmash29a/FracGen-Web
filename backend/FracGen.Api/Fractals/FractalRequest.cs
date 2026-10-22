namespace FracGen.Api.Fractals;

public sealed class FractalRequest
{
    // The VB6 original named the max iteration count K and the escape |z|^2 threshold M.
    public string Type { get; init; } = "mandelbrot";
    public string Palette { get; init; } = "aurora";
    public int Width { get; init; } = 900;
    public int Height { get; init; } = 600;
    public int Iterations { get; init; } = 180;
    public double Bailout { get; init; } = 200;
    public double XMin { get; init; } = -2.6;
    public double XMax { get; init; } = 1.4;
    public double YMin { get; init; } = -4.0 / 3;
    public double YMax { get; init; } = 4.0 / 3;
    public double CReal { get; init; } = -0.194;
    public double CImag { get; init; } = 0.6557;
    public PaletteParameters PaletteParameters { get; init; } = new();

    public List<string> Validate()
    {
        var errors = new List<string>();
        if (Type is not ("mandelbrot" or "julia-quadratic" or "julia-exponential"
            or "julia-sine-exponential" or "julia-cexp"))
            errors.Add("Unknown fractal type.");

        if (Palette is not ("purple-haze" or "rhapsody-in-blue" or "just-the-set"
            or "line" or "circle" or "waves" or "rgb-modifier" or "aurora" or "ember" or "ice"))
            errors.Add("Unknown palette.");

        if (Width is < 100 or > 1600 || Height is < 100 or > 1200)
            errors.Add("Width and height must each be between 100 and their maximum (1600 × 1200).");
        if (Iterations is < 1 or > 2000)
            errors.Add("Iterations must be between 1 and 2000.");
        if (!double.IsFinite(Bailout) || Bailout is < 1 or > 1999)
            errors.Add("Bailout M must be between 1 and 1999.");

        if (!double.IsFinite(XMin) || !double.IsFinite(XMax) ||
            !double.IsFinite(YMin) || !double.IsFinite(YMax) ||
            !(XMax - XMin > 1e-14) || !(YMax - YMin > 1e-14) ||
            XMax - XMin > 1e8 || YMax - YMin > 1e8)
            errors.Add("Viewport coordinates must be finite, ordered and have a usable span.");
        if (!double.IsFinite(CReal) || !double.IsFinite(CImag) ||
            Math.Abs(CReal) > 1e5 || Math.Abs(CImag) > 1e5)
            errors.Add("Julia constants must be finite and within ±100000.");

        if ((long)Width * Height * Iterations > 450_000_000)
            errors.Add("The render is too large. Reduce the resolution or iteration count.");

        if (PaletteParameters is null || !PaletteParameters.IsValid())
            errors.Add("Palette parameters must be integers in the range 0 to 255 (radius 1–127).");

        return errors;
    }
}

public sealed class PaletteParameters
{
    public int[] LineStart { get; init; } = [0, 0, 0];
    public int[] LineEnd { get; init; } = [255, 255, 255];
    public int CircleX { get; init; } = 127;
    public int CircleY { get; init; } = 127;
    // Original VB6 stores r=126 in the settings but passes r+1 to the renderer.
    public int CircleRadius { get; init; } = 127;
    public int CircleBlue { get; init; } = 127;
    public int RgbR { get; init; } = 1;
    public int RgbG { get; init; } = 1;
    public int RgbB { get; init; } = 1;

    public bool IsValid() => ValidRgb(LineStart) && ValidRgb(LineEnd)
        && ValidByte(CircleX) && ValidByte(CircleY) && ValidByte(CircleBlue)
        && CircleRadius is >= 1 and <= 127
        && ValidByte(RgbR) && ValidByte(RgbG) && ValidByte(RgbB);

    private static bool ValidRgb(int[]? rgb) => rgb is { Length: 3 } && rgb.All(ValidByte);
    private static bool ValidByte(int v) => v is >= 0 and <= 255;
}
